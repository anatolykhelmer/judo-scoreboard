import { useEffect, useRef, useState } from 'react';
import { createInitialState } from '../engine/matchState';
import { TICK_INTERVAL_MS } from '../engine/rules';
import { createWire, loadPersisted, persist, resumeFrom } from '../sync/channel';
import type { Persisted } from '../sync/channel';
import { createPanelStore } from '../sync/store';
import type { Store } from '../sync/store';
import { ControlPanel } from './ControlPanel';
import { commandForKey, commandToAction } from './hotkeys';
import { MatchSetup } from './MatchSetup';
import { playGong } from './sound';
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

export function PanelRoot() {
  // Read once, on mount, with a lazy initializer — a pure read of whatever
  // was last persisted, before any store exists. loadPersisted validates the
  // payload and answers null for anything it does not recognise, so a corrupt
  // or future-schema saved contest starts the operator at the setup form
  // instead of throwing here, on the render before any button exists.
  //
  // A saved contest is worth asking about only once it is past the setup
  // form: an unfinished setup has nothing to lose, and prompting about it
  // would just be noise.
  const [saved] = useState<Persisted | null>(() => loadPersisted());
  const resumable = saved !== null && saved.state.phase !== 'setup';

  // What "resume" actually restores: the saved contest with its clock frozen
  // where the last write left it, rather than still running and charging the
  // athletes for the outage. Derived rather than stored, so the prompt below
  // shows the operator exactly the time the contest will restart at — and
  // shows it standing still while they decide.
  const resumeTarget = saved ? resumeFrom(saved) : null;

  // Pending (null) only when there is something to ask about. Otherwise we
  // start fresh immediately, exactly as before this feature existed.
  const [choice, setChoice] = useState<'resume' | 'fresh' | null>(resumable ? null : 'fresh');
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
  //
  // While the operator's resume/fresh choice is still pending (choice is
  // null) the effect does nothing — no wire, no store — so the resume
  // prompt below is the only thing rendered. Once a choice is made this
  // effect reruns and creates the store, exactly as it always did.
  useEffect(() => {
    if (choice === null) return;
    const wire = createWire();
    const s = createPanelStore(wire, {
      onConflict: () => setConflict(true),
      ...(choice === 'resume' && resumeTarget ? { initialState: resumeTarget } : {}),
    });
    setStore(s);
    // Resuming a finished contest, or one sitting in golden score, must not
    // replay the gong. The gong effect's `previous` ref still holds the
    // idle placeholder (setup, no golden score) at this point — seeded on
    // the render before any store existed — so without this line the next
    // render's transition from "idle" to "finished"/"golden score" would
    // read as a fresh transition and fire. Seeding `previous` with the
    // store's real first snapshot here means the render that follows
    // `setStore` sees no transition at all: `previous.current` already
    // equals the state it is about to compare against.
    previous.current = s.getSnapshot();
    return () => { s.destroy(); wire.close(); };
    // `resumeTarget` is derived from `saved`, which is read once on mount and
    // never reassigned, so it is intentionally left out of the dependency
    // list below: it is the same contest on every render.
  }, [choice]);

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

  // Gong: when regulation time runs out, and when the contest ends. Seeded
  // from `state` on the very first render (the idle snapshot). The
  // store-creation effect above overwrites this with the store's actual
  // first snapshot the moment the store exists — see the comment there for
  // why that matters when resuming a contest that is already finished or
  // already in golden score.
  const previous = useRef(state);
  useEffect(() => {
    const was = previous.current;
    previous.current = state;
    if (state.phase === 'finished' && was.phase !== 'finished') playGong();
    else if (state.goldenScore && !was.goldenScore) playGong();
  }, [state]);

  // Waiting on the operator to say whether a saved contest should be
  // resumed. `resumable` guarantees `resumeTarget` is non-null here.
  if (choice === null && resumeTarget) {
    const white = resumeTarget.white.name || 'White';
    const blue = resumeTarget.blue.name || 'Blue';
    return (
      <div style={{ maxWidth: 480, margin: '4rem auto', textAlign: 'center' }}>
        <h2>Resume the interrupted contest?</h2>
        <p>
          {white} vs {blue}
          {resumeTarget.category ? ` — ${resumeTarget.category}` : ''}
        </p>
        <p style={{ fontSize: '2.5rem', fontVariantNumeric: 'tabular-nums' }}>
          {clockText(resumeTarget, now)}
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button onClick={() => setChoice('resume')}>Resume contest</button>
          <button
            onClick={() => {
              // Overwrite the saved contest now, not just in memory — a
              // second reload before any score is dispatched must not ask
              // about a contest the operator already dismissed.
              persist(createInitialState());
              setChoice('fresh');
            }}
          >
            Start fresh
          </button>
        </div>
      </div>
    );
  }

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
