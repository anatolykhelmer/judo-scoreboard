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
  /**
   * Called when a panel-ack from another panel arrives on the channel — an
   * existing panel announcing that it owns the contest. In practice that is
   * the answer to this store's own claim, but the store does not match acks
   * to claims: any foreign ack means this tab is not the only panel, which
   * is the thing worth reporting either way.
   *
   * Reporting only, as far as the UI goes: no warning text, no automatic
   * role switch. That decision belongs to whatever component renders the
   * panel. The store does act on it internally though — see `lost` below.
   */
  onConflict?: () => void;
  /**
   * Starting state for the panel, used to resume a contest the operator
   * chose to continue instead of beginning from createInitialState(). Only
   * meaningful for createPanelStore — createScoreboardStore always hydrates
   * from storage itself.
   */
  initialState?: MatchState;
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
  const base = baseStore(opts.initialState ?? createInitialState());

  // Set the moment another panel announces itself. The store learns this
  // before the component it belongs to can re-render, and a panel that has
  // lost the claim must not go on acting like the writer in the meantime: a
  // single TICK in that window can resolve regulation expiry or an osaekomi
  // threshold and broadcast the result, and a scoreboard opening later would
  // receive two answers to its request-state and keep whichever landed
  // second. One writer, or none.
  let lost = false;

  const unsubscribe = wire.subscribe((msg) => {
    if (msg.type === 'panel-ack' && msg.id !== id) {
      lost = true;
      opts.onConflict?.();
      return;
    }
    // Nothing here is ours to answer any more: not the current state, and
    // not ownership of the contest.
    if (lost) return;

    if (msg.type === 'request-state') {
      wire.post({ type: 'state', state: base.get() });
    } else if (msg.type === 'panel-claim' && msg.id !== id) {
      wire.post({ type: 'panel-ack', id });
    }
  });
  // Subscribe first: an immediate ack must not arrive before the listener exists.
  wire.post({ type: 'panel-claim', id });

  return {
    subscribe: base.subscribe,
    getSnapshot: base.get,
    dispatch(action) {
      // A panel that has lost the claim writes nothing at all. The component
      // stops its tick loop and its key listener as soon as it re-renders,
      // but this closes the window before that render happens — and it is
      // the store, not the component, that finds out first.
      if (lost) return;

      // One reading of the clock for both the engine and the payload: what
      // gets persisted is the moment this state became true, which is what
      // resumeFrom measures a restored clock against.
      const at = now();
      const prev = base.get();
      const next = reduce(prev, action, at);
      if (next === prev) return;
      base.set(next);
      persist(next, opts.storage, at);
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
  // The scoreboard has no use for the write timestamp: it renders whatever
  // the panel last said and its clock is derived from the state's own
  // timestamps. It only needs the state to be there and to be intact.
  const base = baseStore(loadPersisted(opts.storage)?.state ?? createInitialState());

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
