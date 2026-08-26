import type { MatchState } from '../engine/matchState';

export const CHANNEL_NAME = 'judo-scoreboard';
export const STORAGE_KEY = 'judo-scoreboard:state';
const FALLBACK_KEY = 'judo-scoreboard:msg';

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

export function persist(state: MatchState, storage: Storage | null = defaultStorage()): void {
  storage?.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadPersisted(storage: Storage | null = defaultStorage()): MatchState | null {
  const raw = storage?.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MatchState;
  } catch {
    return null;
  }
}
