import { useEffect, useState } from 'react';
import { createInitialState } from '../engine/matchState';
import { createWire } from '../sync/channel';
import { createScoreboardStore } from '../sync/store';
import type { Store } from '../sync/store';
import { Scoreboard } from './Scoreboard';
import { useMatchState } from './useMatchState';
import { useNow } from './useNow';

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
    const wire = createWire();
    const s = createScoreboardStore(wire);
    setStore(s);
    return () => { s.destroy(); wire.close(); };
  }, []);

  const state = useMatchState(store ?? IDLE_STORE);
  const now = useNow(100);
  const [dismissed, setDismissed] = useState(false);

  return (
    <>
      <Scoreboard state={state} now={now} />
      {!dismissed && (
        <button
          style={{
            position: 'fixed',
            inset: 0,
            width: '100%',
            height: '100%',
            border: 0,
            background: 'rgba(0,44,90,0.92)',
            color: 'white',
            fontSize: '3vw',
            cursor: 'pointer',
          }}
          onClick={() => {
            void document.documentElement.requestFullscreen().catch(() => {});
            setDismissed(true);
          }}
        >
          Click to go fullscreen
        </button>
      )}
    </>
  );
}
