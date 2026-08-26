import { useEffect, useRef, useState } from 'react';
import { createInitialState } from '../engine/matchState';
import { TICK_INTERVAL_MS } from '../engine/rules';
import { createWire } from '../sync/channel';
import { createPanelStore } from '../sync/store';
import type { Store } from '../sync/store';
import { ControlPanel } from './ControlPanel';
import { commandForKey, commandToAction } from './hotkeys';
import { MatchSetup } from './MatchSetup';
import { playGong } from './sound';
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

export function PanelRoot() {
  const [conflict, setConflict] = useState(false);
  const [store, setStore] = useState<Store | null>(null);

  // Creation and teardown both live in this one effect, not split across
  // useMemo (for creation) and a separate useEffect (for teardown):
  // createPanelStore has side effects (it opens a channel and posts a
  // panel-claim), and in development React's Strict Mode deliberately
  // mounts, cleans up, and remounts every effect once to catch exactly that
  // kind of impurity. If creation happened outside this effect, that
  // simulated remount would destroy the store right after mount and never
  // recreate it, leaving the panel permanently deaf on the channel — unable
  // to answer a scoreboard's request-state or detect a genuine second panel
  // — for the rest of its life. Keeping both in the same effect means the
  // simulated remount tears down and correctly rebuilds a live store.
  useEffect(() => {
    const wire = createWire();
    const s = createPanelStore(wire, { onConflict: () => setConflict(true) });
    setStore(s);
    return () => { s.destroy(); wire.close(); };
  }, []);

  useEffect(() => {
    if (!store) return;
    const id = window.setInterval(() => store.dispatch({ type: 'TICK' }), TICK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [store]);

  const state = useMatchState(store ?? IDLE_STORE);
  const now = useNow(100);

  // Keyboard. Held down keys must not repeat-fire, and typing in the setup
  // form must never register a score.
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      const command = commandForKey(event.key);
      if (!command) return;
      event.preventDefault();
      (store ?? IDLE_STORE).dispatch(commandToAction(command, stateRef.current));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [store]);

  // Gong: when regulation time runs out, and when the contest ends.
  const previous = useRef(state);
  useEffect(() => {
    const was = previous.current;
    previous.current = state;
    if (state.phase === 'finished' && was.phase !== 'finished') playGong();
    else if (state.goldenScore && !was.goldenScore) playGong();
  }, [state]);

  // Briefly true only before the effect above has run for the first time.
  if (!store) return null;

  // Two panels would race for ownership of the contest, and the scoreboard
  // would show whichever wrote last. Refuse rather than let that happen.
  if (conflict) {
    return (
      <div style={{ maxWidth: 480, margin: '4rem auto', textAlign: 'center' }}>
        <h2>A control panel is already open</h2>
        <p>
          Only one panel can run a contest. Open this tab as the scoreboard
          instead, or close the other panel and reload this page.
        </p>
        <a href="?role=scoreboard">Open as scoreboard</a>
      </div>
    );
  }

  if (state.phase === 'setup') {
    return <MatchSetup state={state} dispatch={store.dispatch} />;
  }

  return <ControlPanel state={state} dispatch={store.dispatch} now={now} />;
}
