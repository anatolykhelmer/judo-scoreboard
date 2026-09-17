import { afterEach, describe, expect, it } from 'vitest';
import { osaekomiElapsed, remaining } from '../engine/clock';
import { createWire, loadPersisted, persist, PERSIST_VERSION, resumeFrom, STORAGE_KEY } from './channel';
import type { Wire } from './channel';
import { createPanelStore, createScoreboardStore } from './store';
import type { Store } from './store';
import { createInitialState } from '../engine/matchState';
import type { MatchState } from '../engine/matchState';
import { DEFAULT_COUNTRY } from '../data/countries';

function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => { map.delete(k); },
    setItem: (k: string, v: string) => { map.set(k, v); },
  } as Storage;
}

/**
 * One turn of the event loop. Only correct for asserting that something has
 * *not* happened: nothing schedules message delivery onto this boundary, so
 * waiting on it for a message that is supposed to arrive is a coin flip.
 * Use waitFor/signal below for anything that must happen.
 */
const tickMicro = () => new Promise((r) => setTimeout(r, 0));

const WAIT_TIMEOUT_MS = 2_000;

/**
 * Resolves when the store's snapshot satisfies `predicate`, checking the
 * current snapshot first so a message that arrived before we subscribed is
 * not missed. The timeout keeps a genuine regression a failing test rather
 * than a hung one.
 *
 * Node's BroadcastChannel does not deliver on any particular event-loop
 * boundary, so the old `await setTimeout(0)` failed roughly one run in seven.
 */
function waitFor(store: Store, predicate: (s: MatchState) => boolean, what: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (predicate(store.getSnapshot())) return resolve();
    let unsubscribe = () => {};
    const timer = setTimeout(() => {
      unsubscribe();
      reject(new Error(`timed out waiting for ${what}`));
    }, WAIT_TIMEOUT_MS);
    unsubscribe = store.subscribe(() => {
      if (!predicate(store.getSnapshot())) return;
      clearTimeout(timer);
      unsubscribe();
      resolve();
    });
  });
}

/**
 * A one-shot promise plus the callback that resolves it, for the events that
 * arrive as a callback rather than as a state change (onConflict, a probe
 * wire's messages). Same reasoning as waitFor: wait on the event itself.
 */
function signal(what: string): { fire: () => void; fired: Promise<void> } {
  let fire = () => {};
  const fired = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${what}`)), WAIT_TIMEOUT_MS);
    fire = () => {
      clearTimeout(timer);
      resolve();
    };
  });
  return { fire, fired };
}

/** Wraps a real Storage, counting setItem calls, so the test still exercises the real fake. */
function countingStorage(storage: Storage): Storage & { setCount(): number } {
  let count = 0;
  return {
    get length() { return storage.length; },
    clear: () => storage.clear(),
    getItem: (k: string) => storage.getItem(k),
    key: (i: number) => storage.key(i),
    removeItem: (k: string) => storage.removeItem(k),
    setItem: (k: string, v: string) => { count += 1; storage.setItem(k, v); },
    setCount: () => count,
  } as Storage & { setCount(): number };
}

/** Wraps a real Wire, counting post calls, so the test still exercises the real transport. */
function countingWire(wire: Wire): Wire & { postCount(): number } {
  let count = 0;
  return {
    post: (msg) => { count += 1; wire.post(msg); },
    subscribe: (fn) => wire.subscribe(fn),
    close: () => wire.close(),
    postCount: () => count,
  };
}

let open: Array<Wire | Store> = [];
function track<T extends Wire | Store>(x: T): T { open.push(x); return x; }

afterEach(() => {
  for (const x of open) ('close' in x ? x.close() : x.destroy());
  open = [];
});

function uniqueName(): string {
  return `judo-test-${Math.random().toString(36).slice(2)}`;
}

const SETUP = {
  type: 'SETUP_MATCH' as const,
  white: 'Ivanov',
  blue: 'Cohen',
  category: 'U15 -50',
  durationMs: 120_000,
  swapSides: false,
  logoDataUrl: null,
  theme: 'modern' as const,
  round: '',
  whiteCountry: 'IJF',
  blueCountry: 'IJF',
};

describe('persistence', () => {
  it('round-trips a state through storage, with the moment it was written', () => {
    const storage = fakeStorage();
    const state = createInitialState();
    persist(state, storage, 1_700_000_000_000);
    expect(storage.getItem(STORAGE_KEY)).toBeTruthy();
    expect(loadPersisted(storage)).toEqual({ state, savedAt: 1_700_000_000_000 });
  });

  it('stamps the payload with the schema version', () => {
    const storage = fakeStorage();
    persist(createInitialState(), storage, 1_700_000_000_000);
    expect(JSON.parse(storage.getItem(STORAGE_KEY) as string).version).toBe(PERSIST_VERSION);
  });

  it('returns null on absent or corrupt data', () => {
    const storage = fakeStorage();
    expect(loadPersisted(storage)).toBeNull();
    storage.setItem(STORAGE_KEY, 'not json');
    expect(loadPersisted(storage)).toBeNull();
  });

  // Everything below would previously have been handed to the renderers as a
  // MatchState and thrown on the first property access — during the render
  // that happens before any button exists, on every reload, unrecoverably
  // without DevTools.
  it('returns null for a payload written by an unknown schema version', () => {
    const storage = fakeStorage();
    persist(createInitialState(), storage, 1_700_000_000_000);
    const payload = JSON.parse(storage.getItem(STORAGE_KEY) as string);
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...payload, version: PERSIST_VERSION + 1 }));
    expect(loadPersisted(storage)).toBeNull();
  });

  it('returns null for a payload with no version at all', () => {
    const storage = fakeStorage();
    // Exactly what the previous release wrote: the bare state, unversioned.
    storage.setItem(STORAGE_KEY, JSON.stringify(createInitialState()));
    expect(loadPersisted(storage)).toBeNull();
  });

  it('returns null when the state is missing', () => {
    const storage = fakeStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: PERSIST_VERSION, savedAt: 1_700_000_000_000, state: null }),
    );
    expect(loadPersisted(storage)).toBeNull();
  });

  it('returns null when the state is missing a key the app renders', () => {
    const storage = fakeStorage();
    for (const key of ['white', 'blue', 'clock', 'osaekomi', 'phase'] as const) {
      const state: Record<string, unknown> = { ...createInitialState() };
      delete state[key];
      storage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: PERSIST_VERSION, savedAt: 1_700_000_000_000, state }),
      );
      expect(loadPersisted(storage), `missing ${key}`).toBeNull();
    }
  });

  // A v2 payload is supposed to carry these, but a hand-edited or
  // half-migrated one may not, and the IJF board spreads the country and
  // the setup form seeds its chips from the theme: a missing value must
  // not cost the contest, so it is filled in rather than refused.
  it('fills in the theme when the payload has none', () => {
    const storage = fakeStorage();
    const state: Record<string, unknown> = { ...createInitialState() };
    delete state.theme;
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: PERSIST_VERSION, savedAt: 1_700_000_000_000, state }),
    );
    expect(loadPersisted(storage)?.state.theme).toBe('tv');
  });

  it('fills in a country for a side that has none, or not a string', () => {
    const storage = fakeStorage();
    const base = createInitialState();
    const state = {
      ...base,
      white: { ...base.white, country: undefined },
      blue: { ...base.blue, country: 7 },
    };
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: PERSIST_VERSION, savedAt: 1_700_000_000_000, state }),
    );
    const loaded = loadPersisted(storage);
    expect(loaded?.state.white.country).toBe(DEFAULT_COUNTRY);
    expect(loaded?.state.blue.country).toBe(DEFAULT_COUNTRY);
  });

  it('returns null when a side is not an object', () => {
    const storage = fakeStorage();
    const state = { ...createInitialState(), white: 'Ivanov' };
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: PERSIST_VERSION, savedAt: 1_700_000_000_000, state }),
    );
    expect(loadPersisted(storage)).toBeNull();
  });

  it('returns null when the write timestamp is not a number', () => {
    const storage = fakeStorage();
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: PERSIST_VERSION, savedAt: 'yesterday', state: createInitialState() }),
    );
    expect(loadPersisted(storage)).toBeNull();
  });
});

describe('resuming an interrupted contest', () => {
  const SAVED_AT = 1_700_000_000_000;

  function savedMidContest(): { state: MatchState; savedAt: number } {
    const state: MatchState = {
      ...createInitialState(),
      durationMs: 120_000,
      phase: 'fighting',
      // Hajime 113 seconds before the write: 7 seconds of contest left.
      clock: { running: true, startedAt: SAVED_AT - 113_000, elapsedMs: 0 },
    };
    return { state, savedAt: SAVED_AT };
  }

  it('freezes the clock where the last write left it, not where the outage left it', () => {
    const resumed = resumeFrom(savedMidContest());
    expect(resumed.clock).toEqual({ running: false, startedAt: null, elapsedMs: 113_000 });

    // 47 seconds of outage plus however long the operator reads the prompt:
    // none of it comes off the contest.
    expect(remaining(resumed, SAVED_AT + 47_000)).toBe(7_000);
  });

  it('comes back paused, so the referee restarts it with hajime', () => {
    expect(resumeFrom(savedMidContest()).phase).toBe('paused');
  });

  it('leaves any other phase alone', () => {
    for (const phase of ['ready', 'paused', 'finished'] as const) {
      const saved = savedMidContest();
      const resumed = resumeFrom({ ...saved, state: { ...saved.state, phase } });
      expect(resumed.phase, phase).toBe(phase);
    }
  });

  it('freezes a hold in progress too, so it cannot read the outage as hold time', () => {
    const saved = savedMidContest();
    const withHold: MatchState = {
      ...saved.state,
      osaekomi: { side: 'white', startedAt: SAVED_AT - 3_000, elapsedMs: 0, awarded: 'none' },
    };
    const resumed = resumeFrom({ ...saved, state: withHold });
    expect(resumed.osaekomi).toEqual({
      side: 'white',
      startedAt: null,
      elapsedMs: 3_000,
      awarded: 'none',
    });
    expect(osaekomiElapsed(resumed.osaekomi, SAVED_AT + 60_000)).toBe(3_000);
  });

  it('leaves a state with no hold in progress untouched', () => {
    const saved = savedMidContest();
    expect(resumeFrom(saved).osaekomi).toBe(saved.state.osaekomi);
  });
});

describe('panel store', () => {
  it('applies actions and notifies subscribers', () => {
    const panel = track(createPanelStore(track(createWire(uniqueName())), { storage: fakeStorage() }));
    let notified = 0;
    panel.subscribe(() => { notified += 1; });

    panel.dispatch(SETUP);
    expect(panel.getSnapshot().white.name).toBe('Ivanov');
    expect(notified).toBe(1);
  });

  it('stays silent when an action changes nothing', () => {
    const panel = track(createPanelStore(track(createWire(uniqueName())), { storage: fakeStorage() }));
    let notified = 0;
    panel.subscribe(() => { notified += 1; });

    panel.dispatch({ type: 'TICK' });
    expect(notified).toBe(0);
  });

  it('persists after every change', () => {
    const storage = fakeStorage();
    const panel = track(createPanelStore(track(createWire(uniqueName())), { storage }));
    panel.dispatch(SETUP);
    expect(loadPersisted(storage)?.state.white.name).toBe('Ivanov');
  });

  it('begins from initialState when given one, to resume a saved contest', () => {
    const resumed = { ...createInitialState(), phase: 'fighting' as const, category: 'U18 -66' };
    const panel = track(createPanelStore(track(createWire(uniqueName())), {
      storage: fakeStorage(),
      initialState: resumed,
    }));
    expect(panel.getSnapshot()).toEqual(resumed);
  });

  it('begins from a fresh initial state when no initialState is given', () => {
    const panel = track(createPanelStore(track(createWire(uniqueName())), { storage: fakeStorage() }));
    expect(panel.getSnapshot()).toEqual(createInitialState());
  });

  it('does not persist or broadcast on a no-op action', () => {
    const storage = countingStorage(fakeStorage());
    const rawWire = track(createWire(uniqueName()));
    const wire = countingWire(rawWire);
    const panel = track(createPanelStore(wire, { storage }));

    // Baseline after construction: the panel posts its own panel-claim on
    // startup (see "a second panel" below), which is unrelated to this
    // assertion. Only the delta caused by the no-op TICK matters here.
    const postsAfterConstruction = wire.postCount();

    panel.dispatch({ type: 'TICK' });

    expect(wire.postCount()).toBe(postsAfterConstruction);
    expect(storage.setCount()).toBe(0);
  });
});

describe('scoreboard store', () => {
  it('adopts state broadcast by the panel', async () => {
    const name = uniqueName();
    const panel = track(createPanelStore(track(createWire(name)), { storage: fakeStorage() }));
    const board = track(createScoreboardStore(track(createWire(name)), { storage: fakeStorage() }));

    panel.dispatch(SETUP);
    await waitFor(board, (s) => s.white.name === 'Ivanov', 'the broadcast state to arrive');

    expect(board.getSnapshot().category).toBe('U15 -50');
  });

  it('asks for the current state when it opens late', async () => {
    const name = uniqueName();
    const panel = track(createPanelStore(track(createWire(name)), { storage: fakeStorage() }));
    panel.dispatch(SETUP);

    const board = track(createScoreboardStore(track(createWire(name)), { storage: fakeStorage() }));
    await waitFor(board, (s) => s.white.name === 'Ivanov', "the panel's answer to request-state");

    expect(board.getSnapshot().category).toBe('U15 -50');
  });

  it('hydrates from storage when no panel answers', () => {
    const storage = fakeStorage();
    persist({ ...createInitialState(), category: 'restored' }, storage);
    const board = track(createScoreboardStore(track(createWire(uniqueName())), { storage }));
    expect(board.getSnapshot().category).toBe('restored');
  });

  it('ignores dispatch, because it is read-only', () => {
    const board = track(createScoreboardStore(track(createWire(uniqueName())), { storage: fakeStorage() }));
    const before = board.getSnapshot();
    board.dispatch(SETUP);
    expect(board.getSnapshot()).toBe(before);
  });
});

describe('a second panel', () => {
  it('is answered by the panel that already owns the contest', async () => {
    const name = uniqueName();
    track(createPanelStore(track(createWire(name)), { storage: fakeStorage(), id: 'first' }));

    const probe = track(createWire(name));
    const seen: string[] = [];
    const acked = signal('the owning panel to answer the claim');
    probe.subscribe((msg) => { if (msg.type === 'panel-ack') { seen.push(msg.id); acked.fire(); } });
    probe.post({ type: 'panel-claim', id: 'second' });
    await acked.fired;

    expect(seen).toEqual(['first']);
  });

  it('reports a conflict via onConflict when another panel already owns the contest', async () => {
    const name = uniqueName();
    track(createPanelStore(track(createWire(name)), { storage: fakeStorage(), id: 'first' }));

    let conflicts = 0;
    const conflicted = signal('the second panel to learn it lost the claim');
    track(createPanelStore(track(createWire(name)), {
      storage: fakeStorage(),
      id: 'second',
      onConflict: () => { conflicts += 1; conflicted.fire(); },
    }));
    await conflicted.fired;

    expect(conflicts).toBe(1);
  });

  it('stops answering request-state once it has lost the claim', async () => {
    const name = uniqueName();
    track(createPanelStore(track(createWire(name)), { storage: fakeStorage(), id: 'first' }));
    const conflicted = signal('the second panel to learn it lost the claim');
    track(createPanelStore(track(createWire(name)), {
      storage: fakeStorage(),
      id: 'second',
      onConflict: conflicted.fire,
    }));
    await conflicted.fired;

    // A scoreboard opening now must get exactly one answer. Two would race,
    // and it would keep whichever landed second.
    const probe = track(createWire(name));
    let answers = 0;
    const answered = signal('the owning panel to answer request-state');
    probe.subscribe((msg) => { if (msg.type === 'state') { answers += 1; answered.fire(); } });
    probe.post({ type: 'request-state' });
    await answered.fired;
    await tickMicro();
    await tickMicro();

    expect(answers).toBe(1);
  });

  it('stops writing once it has lost the claim', async () => {
    const name = uniqueName();
    track(createPanelStore(track(createWire(name)), { storage: fakeStorage(), id: 'first' }));
    const conflicted = signal('the second panel to learn it lost the claim');
    const second = track(createPanelStore(track(createWire(name)), {
      storage: fakeStorage(),
      id: 'second',
      onConflict: conflicted.fire,
    }));
    await conflicted.fired;

    // The component stops its tick loop and key listener on the next render,
    // but the store knows first and refuses first.
    const before = second.getSnapshot();
    second.dispatch(SETUP);
    expect(second.getSnapshot()).toBe(before);
  });

  it('never reports a conflict when it is the only panel', async () => {
    let conflicts = 0;
    track(createPanelStore(track(createWire(uniqueName())), {
      storage: fakeStorage(),
      onConflict: () => { conflicts += 1; },
    }));
    // Nothing to wait *for* here — the assertion is that an event never
    // arrives, so a couple of turns of the event loop is the honest wait.
    await tickMicro();
    await tickMicro();

    expect(conflicts).toBe(0);
  });
});
