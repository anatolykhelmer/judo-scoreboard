import { afterEach, describe, expect, it } from 'vitest';
import { createWire, loadPersisted, persist, STORAGE_KEY } from './channel';
import type { Wire } from './channel';
import { createPanelStore, createScoreboardStore } from './store';
import type { Store } from './store';
import { createInitialState } from '../engine/matchState';

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

const tickMicro = () => new Promise((r) => setTimeout(r, 0));

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
};

describe('persistence', () => {
  it('round-trips a state through storage', () => {
    const storage = fakeStorage();
    const state = createInitialState();
    persist(state, storage);
    expect(storage.getItem(STORAGE_KEY)).toBeTruthy();
    expect(loadPersisted(storage)).toEqual(state);
  });

  it('returns null on absent or corrupt data', () => {
    const storage = fakeStorage();
    expect(loadPersisted(storage)).toBeNull();
    storage.setItem(STORAGE_KEY, 'not json');
    expect(loadPersisted(storage)).toBeNull();
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
    expect(loadPersisted(storage)?.white.name).toBe('Ivanov');
  });
});

describe('scoreboard store', () => {
  it('adopts state broadcast by the panel', async () => {
    const name = uniqueName();
    const panel = track(createPanelStore(track(createWire(name)), { storage: fakeStorage() }));
    const board = track(createScoreboardStore(track(createWire(name)), { storage: fakeStorage() }));

    panel.dispatch(SETUP);
    await tickMicro();

    expect(board.getSnapshot().white.name).toBe('Ivanov');
    expect(board.getSnapshot().category).toBe('U15 -50');
  });

  it('asks for the current state when it opens late', async () => {
    const name = uniqueName();
    const panel = track(createPanelStore(track(createWire(name)), { storage: fakeStorage() }));
    panel.dispatch(SETUP);
    await tickMicro();

    const board = track(createScoreboardStore(track(createWire(name)), { storage: fakeStorage() }));
    await tickMicro();
    await tickMicro();

    expect(board.getSnapshot().white.name).toBe('Ivanov');
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
    probe.subscribe((msg) => { if (msg.type === 'panel-ack') seen.push(msg.id); });
    probe.post({ type: 'panel-claim', id: 'second' });
    await tickMicro();

    expect(seen).toEqual(['first']);
  });
});
