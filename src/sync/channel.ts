import { elapsed, osaekomiElapsed } from '../engine/clock';
import { DEFAULT_COUNTRY } from '../data/countries';
import type { MatchState } from '../engine/matchState';

export const CHANNEL_NAME = 'judo-scoreboard';
export const STORAGE_KEY = 'judo-scoreboard:state';
const FALLBACK_KEY = 'judo-scoreboard:msg';

/**
 * Bumped whenever the shape of MatchState changes in a way an older payload
 * cannot satisfy. A payload from any other version is discarded rather than
 * fed to a renderer that expects today's shape.
 */
export const PERSIST_VERSION = 2;

export type Msg =
  | { type: 'state'; state: MatchState }
  | { type: 'request-state' }
  | { type: 'panel-claim'; id: string }
  | { type: 'panel-ack'; id: string };

export interface Wire {
  post(msg: Msg): void;
  subscribe(fn: (msg: Msg) => void): () => void;
  close(): void;
}

function broadcastWire(name: string): Wire {
  const channel = new BroadcastChannel(name);
  const listeners = new Set<(msg: Msg) => void>();
  channel.onmessage = (event: MessageEvent) => {
    for (const fn of listeners) fn(event.data as Msg);
  };
  return {
    post: (msg) => channel.postMessage(msg),
    subscribe(fn) {
      listeners.add(fn);
      return () => { listeners.delete(fn); };
    },
    close() {
      listeners.clear();
      channel.close();
    },
  };
}

/** Only reached on browsers without BroadcastChannel — pre-2022 Safari. */
function storageWire(): Wire {
  const listeners = new Set<(msg: Msg) => void>();
  let counter = 0;
  const onStorage = (event: StorageEvent) => {
    if (event.key !== FALLBACK_KEY || !event.newValue) return;
    const parsed = JSON.parse(event.newValue) as { msg: Msg };
    for (const fn of listeners) fn(parsed.msg);
  };
  window.addEventListener('storage', onStorage);
  return {
    post(msg) {
      counter += 1;
      window.localStorage.setItem(FALLBACK_KEY, JSON.stringify({ n: counter, msg }));
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => { listeners.delete(fn); };
    },
    close() {
      listeners.clear();
      window.removeEventListener('storage', onStorage);
    },
  };
}

export function createWire(name: string = CHANNEL_NAME): Wire {
  return typeof BroadcastChannel !== 'undefined' ? broadcastWire(name) : storageWire();
}

function defaultStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** A saved contest: the state, and the wall-clock moment it was written. */
export interface Persisted {
  state: MatchState;
  /** Epoch ms. What a restored clock is measured against — see resumeFrom. */
  savedAt: number;
}

export function persist(
  state: MatchState,
  storage: Storage | null = defaultStorage(),
  savedAt: number = Date.now(),
): void {
  storage?.setItem(STORAGE_KEY, JSON.stringify({ version: PERSIST_VERSION, savedAt, state }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * The keys the app reads before the operator can touch anything: the panel
 * renders the athletes' names and the clock on its resume prompt, and the
 * scoreboard renders the whole board on hydration. A payload missing any of
 * them would throw during that first render, unmount the tree and do it again
 * on every reload — the app would be bricked for anyone without DevTools.
 *
 * `osaekomi` is on the list for the same reason as the rest: both screens
 * dereference `state.osaekomi.side` unconditionally, and resumeFrom below
 * reads the hold's timestamps.
 */
const REQUIRED_STATE_KEYS = ['white', 'blue', 'clock', 'osaekomi', 'phase'] as const;

/**
 * Returns null for anything that is not a payload this version wrote:
 * absent, unparseable, a different schema version, no state at all, or a
 * state missing a key the renderers depend on. Every one of those means
 * "nothing to restore", which costs at most one contest's setup — never a
 * crash the operator cannot recover from.
 */
export function loadPersisted(storage: Storage | null = defaultStorage()): Persisted | null {
  const raw = storage?.getItem(STORAGE_KEY);
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) return null;
  if (parsed.version !== PERSIST_VERSION) return null;
  if (typeof parsed.savedAt !== 'number' || !Number.isFinite(parsed.savedAt)) return null;

  const state = parsed.state;
  if (!isRecord(state)) return null;
  for (const key of REQUIRED_STATE_KEYS) {
    if (state[key] === undefined || state[key] === null) return null;
  }
  if (!isRecord(state.white) || !isRecord(state.blue)) return null;

  return { state: withDefaults(state) as unknown as MatchState, savedAt: parsed.savedAt };
}

/**
 * The fields version 2 added and the renderers dereference without a guard:
 * the IJF board spreads each side's country into letters, and the setup form
 * seeds its theme chips from the theme. Both have a value that costs the
 * operator nothing — the neutral entry and the board that shipped first — so
 * a payload without them, hand-edited or written by a build between the two
 * versions, is filled in rather than thrown away like a payload with no
 * athletes. The theme is left as it is when it is a string: an id this build
 * does not know is themeFor's problem, and it already falls back to modern.
 */
function withDefaults(state: Record<string, unknown>): Record<string, unknown> {
  const side = (s: unknown) => {
    const record = s as Record<string, unknown>;
    return typeof record.country === 'string' ? record : { ...record, country: DEFAULT_COUNTRY };
  };
  return {
    ...state,
    white: side(state.white),
    blue: side(state.blue),
    theme: typeof state.theme === 'string' ? state.theme : 'modern',
  };
}

/**
 * The state a resumed contest starts from: every timer frozen where it stood
 * when the state was last written.
 *
 * The clock is derived from timestamps, so restoring it as it was saved —
 * running, with its original startedAt — would charge the athletes for the
 * entire outage: the crash, the reload, and the seconds the operator spends
 * reading the resume prompt. A contest saved with 7 seconds left and resumed
 * after 47 seconds would be over on the first TICK. Freezing at savedAt
 * instead loses only the interval between the last recorded change and the
 * crash, and gives that interval back to the athletes rather than taking it
 * from them. That is the right direction for the error; the referee holds the
 * real clock anyway.
 *
 * A contest that was fighting comes back paused, so it restarts with hajime
 * rather than silently running again. Any other phase is left alone.
 */
export function resumeFrom({ state, savedAt }: Persisted): MatchState {
  return {
    ...state,
    clock: { running: false, startedAt: null, elapsedMs: elapsed(state.clock, savedAt) },
    // The hold is a clock too, and a stale one is worse: left running, its
    // first tick after hajime would read the whole outage as hold time and
    // award an ippon nobody held for. Frozen, it shows the operator the time
    // it had actually earned, and toketa or mate clears it.
    osaekomi:
      state.osaekomi.side === null
        ? state.osaekomi
        : { ...state.osaekomi, startedAt: null, elapsedMs: osaekomiElapsed(state.osaekomi, savedAt) },
    phase: state.phase === 'fighting' ? 'paused' : state.phase,
  };
}
