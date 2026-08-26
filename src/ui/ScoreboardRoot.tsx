import { useEffect, useState } from 'react';
import { createInitialState } from '../engine/matchState';
import { createWire } from '../sync/channel';
import { createScoreboardStore } from '../sync/store';
import type { Store } from '../sync/store';
import { useMatchState } from './useMatchState';
import { clockText, useNow } from './useNow';

// A stable placeholder used only for the instant before the real store
// exists (see the effect below). getSnapshot must return the same cached
// reference every call, or useSyncExternalStore treats each render as a new
// snapshot and re-renders forever.
const IDLE_SNAPSHOT = createInitialState();
const IDLE_STORE: Store = {
  subscribe: () => () => {},
  getSnapshot: () => IDLE_SNAPSHOT,
  dispatch: () => {},
  destroy: () => {},
};

export function ScoreboardRoot() {
  const [store, setStore] = useState<Store | null>(null);

  // See PanelRoot for why creation and teardown both live in this one
  // effect rather than useMemo plus a separate cleanup effect: Strict Mode's
  // development-only mount -> cleanup -> remount simulation would otherwise
  // destroy the store right after mount and never recreate it, leaving this
  // tab permanently unable to receive further broadcasts from the panel.
  useEffect(() => {
    const s = createScoreboardStore(createWire());
    setStore(s);
    return () => s.destroy();
  }, []);

  const state = useMatchState(store ?? IDLE_STORE);
  const now = useNow(100);

  return (
    <div style={{ height: '100%', display: 'grid', placeItems: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <h1>{state.white.name} — {state.blue.name}</h1>
        <p style={{ fontSize: '10vw', fontVariantNumeric: 'tabular-nums' }}>
          {clockText(state, now)}
        </p>
      </div>
    </div>
  );
}
