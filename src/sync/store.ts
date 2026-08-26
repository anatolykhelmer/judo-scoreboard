import { reduce } from '../engine/matchEngine';
import type { Action } from '../engine/matchEngine';
import { createInitialState } from '../engine/matchState';
import type { MatchState } from '../engine/matchState';
import { loadPersisted, persist } from './channel';
import type { Wire } from './channel';

export interface Store {
  subscribe(listener: () => void): () => void;
  getSnapshot(): MatchState;
  dispatch(action: Action): void;
  destroy(): void;
}

interface Opts {
  now?: () => number;
  storage?: Storage | null;
  id?: string;
}

function baseStore(initial: MatchState) {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(next: MatchState) {
      if (next === state) return;
      state = next;
      for (const fn of listeners) fn();
    },
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => { listeners.delete(fn); };
    },
    clear() { listeners.clear(); },
  };
}

/**
 * The panel owns the contest. It is the only writer: it runs the engine,
 * persists every change and broadcasts it. Because `reduce` returns the same
 * object when nothing changed, an idle tick costs no message at all.
 */
export function createPanelStore(wire: Wire, opts: Opts = {}): Store {
  const now = opts.now ?? (() => Date.now());
  const id = opts.id ?? Math.random().toString(36).slice(2);
  const base = baseStore(createInitialState());

  const unsubscribe = wire.subscribe((msg) => {
    if (msg.type === 'request-state') {
      wire.post({ type: 'state', state: base.get() });
    } else if (msg.type === 'panel-claim' && msg.id !== id) {
      wire.post({ type: 'panel-ack', id });
    }
  });

  return {
    subscribe: base.subscribe,
    getSnapshot: base.get,
    dispatch(action) {
      const prev = base.get();
      const next = reduce(prev, action, now());
      if (next === prev) return;
      base.set(next);
      persist(next, opts.storage);
      wire.post({ type: 'state', state: next });
    },
    destroy() {
      unsubscribe();
      base.clear();
    },
  };
}

/** Read-only. Hydrates from storage, then asks any live panel for the truth. */
export function createScoreboardStore(wire: Wire, opts: Opts = {}): Store {
  const base = baseStore(loadPersisted(opts.storage) ?? createInitialState());

  const unsubscribe = wire.subscribe((msg) => {
    if (msg.type === 'state') base.set(msg.state);
  });
  wire.post({ type: 'request-state' });

  return {
    subscribe: base.subscribe,
    getSnapshot: base.get,
    dispatch() {},
    destroy() {
      unsubscribe();
      base.clear();
    },
  };
}
