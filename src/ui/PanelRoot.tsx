import { useEffect, useRef, useState } from 'react';
import type { Action } from '../engine/matchEngine';
import { createInitialState } from '../engine/matchState';
import type { MatchState } from '../engine/matchState';
import { TICK_INTERVAL_MS } from '../engine/rules';
import { claimContest, postResult } from '../server/client';
import type { ClaimErr, ResultErr } from '../server/client';
import { parseServerLink } from '../server/parseLink';
import type { ServerLink } from '../server/parseLink';
import type { ContestFields } from '../server/payload';
import {
  clearSession,
  getOrCreatePanelId,
  loadSession,
  resolveToken,
  saveSession,
  serverResumable,
} from '../server/session';
import type { ServerSession } from '../server/session';
import { createWire, loadPersisted, persist, resumeFrom } from '../sync/channel';
import type { Persisted } from '../sync/channel';
import { createPanelStore } from '../sync/store';
import type { Store } from '../sync/store';
import { ControlPanel } from './ControlPanel';
import './entry.css';
import { commandForKey, commandToAction } from './hotkeys';
import { JudoMark } from './JudoMark';
import { MatchSetup } from './MatchSetup';
import {
  ClaimError,
  ConfirmHost,
  LinkNotice,
  PinPrompt,
  QueueDone,
  ResultError,
  ServerBusy,
} from './ServerNotice';
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

/**
 * Where the panel stands with the optional tournament server. Only ever
 * leaves 'off' when the link carried a usable `api` — see parseServerLink.
 *
 * Everything before 'running' is a gate: no store exists yet, because a
 * contest claimed from a server must not be mixed with whatever this
 * browser was doing last.
 */
type Stage =
  /** Standalone. No claim, no report — the whole app before this feature. */
  | { kind: 'off' }
  /** The link named a server but not a contest on it, or named it badly. */
  | { kind: 'link'; link: 'incomplete' | 'invalid' }
  /** Waiting for the operator to confirm the host. Nothing fetched yet. */
  | { kind: 'confirm' }
  | { kind: 'claiming' }
  /** `next` says which claim the typed PIN belongs to — this bout's or the one after. */
  | { kind: 'pin'; token: string; next: boolean; invalid: boolean }
  | { kind: 'claim-error'; token: string; error: ClaimErr['error'] }
  /** Claimed. The contest is the panel's, and its result is owed. */
  | { kind: 'running' }
  | { kind: 'posting' }
  | { kind: 'result-error'; token: string; error: ResultErr['error'] }
  /** The result is in. Taking the ticket the server answered with. */
  | { kind: 'next'; token: string }
  | { kind: 'next-error'; token: string; error: ClaimErr['error'] }
  /** The result is in and this mat has nothing else scheduled. */
  | { kind: 'done' };

function panelStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * Regulation time has run out with a hold still on. The engine stops the
 * clock but leaves the contest fighting, because only the osaekomi can still
 * change the result — which is exactly why the gong matters here: it tells
 * the mat that nothing else is live any more.
 *
 * Derived from the state the panel already has rather than from a flag in the
 * engine: not golden score, clock stopped, and no regulation time left. The
 * decisive expiries reach the earlier branches of the chain below instead, so
 * this never doubles up with them.
 */
function regulationRanOut(s: MatchState): boolean {
  return !s.goldenScore && !s.clock.running && s.clock.elapsedMs >= s.durationMs;
}

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
  const standaloneResumable = saved !== null && saved.state.phase !== 'setup';

  // What "resume" actually restores: the saved contest with its clock frozen
  // where the last write left it, rather than still running and charging the
  // athletes for the outage. Derived rather than stored, so the prompt below
  // shows the operator exactly the time the contest will restart at — and
  // shows it standing still while they decide.
  const resumeTarget = saved ? resumeFrom(saved) : null;

  // The server link, and the session it may already have on this browser.
  // Both read once, on mount, for the same reason `saved` is: they are the
  // state of the world before the operator has touched anything, and every
  // decision below is measured against that snapshot rather than against a
  // session this page load has itself just written.
  const [link] = useState<ServerLink>(() => parseServerLink(window.location));
  const [sessionAtLoad] = useState<ServerSession | null>(() => loadSession(panelStorage()));

  // The contest this panel is on. The hash is only the entry ticket — a
  // stored token for the same host wins, so a reload does not drag the
  // table back to the first bout of the day. See resolveToken.
  // Advances only when the next contest has actually been claimed, so a
  // failed result POST still has the token it must retry with.
  const [token, setToken] = useState(() =>
    link.kind === 'ok' ? resolveToken(link, sessionAtLoad) : '',
  );

  // True from a successful claim until the queue ends or the operator walks
  // away: the panel owes this contest a report. Nothing is ever posted
  // while this is false.
  const [bound, setBound] = useState(false);

  // Bumped to rebuild the store for the next bout of the day. A counter
  // rather than a flag, because the same table may work through many.
  const [storeEpoch, setStoreEpoch] = useState(0);

  const [stage, setStage] = useState<Stage>(() => {
    if (link.kind === 'ok') return { kind: 'confirm' };
    if (link.kind === 'absent') return { kind: 'off' };
    return { kind: 'link', link: link.kind };
  });

  // The claimed contest, waiting for the setup form to seed itself from it.
  const [prefill, setPrefill] = useState<ContestFields | null>(null);

  // Pending (null) only when there is something to ask about. Otherwise we
  // start fresh immediately, exactly as before this feature existed.
  //
  // A server link holds it pending for a second reason: the claim has not
  // happened yet, and a store created now would be a contest this table was
  // never given.
  const [choice, setChoice] = useState<'resume' | 'fresh' | null>(
    link.kind === 'ok' || standaloneResumable ? null : 'fresh',
  );
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
    // Same reasoning for the result POST, and it matters more: a resumed
    // contest that is *already* finished must not be reported on the render
    // that restores it. It may not even be this ticket's contest.
    previousForResult.current = s.getSnapshot();
    return () => { s.destroy(); wire.close(); };
    // `resumeTarget` is derived from `saved`, which is read once on mount and
    // never reassigned, so it is intentionally left out of the dependency
    // list below: it is the same contest on every render.
    //
    // `storeEpoch` is here so the next bout of the day gets a store built
    // from createInitialState — a fresh contest at phase 'setup' — rather
    // than the one the previous bout finished in.
  }, [choice, storeEpoch]);

  // Both of the effects below are gated on `!conflict`, not just hidden by
  // the early return further down: that return sits below every hook, so a
  // refusing panel would otherwise keep ticking and keep listening for keys
  // while telling the operator that only one panel can run a contest. The
  // Resume button on that screen is the obvious thing to click, and one TICK
  // from a second panel is enough to resolve regulation expiry or an
  // osaekomi threshold and broadcast it.
  useEffect(() => {
    if (!store || conflict) return;
    const id = window.setInterval(() => store.dispatch({ type: 'TICK' }), TICK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [store, conflict]);

  const state = useMatchState(store ?? IDLE_STORE);
  const now = useNow(100);

  // Keyboard. Held down keys must not repeat-fire, and typing in the setup
  // form must never register a score.
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (conflict) return;
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
  }, [store, conflict]);

  // Gong: spec section 9's two triggers — expiry of regulation time, and the
  // end of the contest. Entering golden score is not a third trigger; the
  // goldenScore edge is only a proxy for the expiry that ends in a tie, and
  // the third branch is a proxy for the expiry that leaves a hold running,
  // where the engine keeps phase 'fighting', goldenScore false and winner
  // null. All three branches stand for one of the two triggers, so each
  // trigger must sound exactly once.
  //
  // Hence `!regulationRanOut(was)` on the golden-score branch. When a hold
  // defers the decision, expiry already sounded on branch 3 and the tie only
  // arrives seconds later, at toketa — without the guard the same expiry
  // would sound twice, the second time at the instant golden score begins.
  // On the ordinary tie the clock was still running an instant earlier, so
  // regulationRanOut(was) is false and the gong fires as it always did.
  //
  // `previous` is seeded from `state` on the very first render (the idle
  // snapshot). The store-creation effect above overwrites it with the store's
  // actual first snapshot the moment the store exists — see the comment there
  // for why that matters when resuming a contest that is already finished,
  // already in golden score, or already out of regulation time.
  const previous = useRef(state);
  useEffect(() => {
    const was = previous.current;
    previous.current = state;
    if (state.phase === 'finished' && was.phase !== 'finished') playGong();
    else if (state.goldenScore && !was.goldenScore && !regulationRanOut(was)) playGong();
    else if (regulationRanOut(state) && !regulationRanOut(was)) playGong();
  }, [state]);

  /**
   * The table's report, owed once per contest.
   *
   * A transition into `finished`, not the standing condition, and the
   * difference is not pedantry: resuming a contest that is already
   * finished would otherwise post it, and after a result has been accepted
   * the leftover finished bout in storage belongs to the ticket *before*
   * the one this panel now holds. The store-creation effect seeds
   * `previousForResult` with the store's own first snapshot so a restored
   * contest starts from where it is rather than from the idle placeholder.
   *
   * The ref is set before the request is awaited, so Strict Mode's
   * deliberate double-invoke cannot send two reports for one contest.
   */
  const resultPostedForToken = useRef<string | null>(null);
  const previousForResult = useRef(state);
  useEffect(() => {
    const was = previousForResult.current;
    previousForResult.current = state;
    if (state.phase !== 'finished' || was.phase === 'finished') return;
    if (!bound || link.kind !== 'ok') return;
    if (resultPostedForToken.current === token) return;
    resultPostedForToken.current = token;
    void runResult(state, token);
  }, [state]);

  /**
   * Send the report, then do whatever the server's answer asks for.
   *
   * Reached from the effect above when the contest ends, and from Retry
   * when that failed. Retrying is safe by contract: the server keeps the
   * first report it accepted and answers a repeat with the same 200, so a
   * lost `nextToken` can be read again without inventing a second result.
   */
  async function runResult(finished: MatchState, resultToken: string): Promise<void> {
    if (link.kind !== 'ok') return;
    const storage = panelStorage();
    if (!storage) {
      setStage({ kind: 'result-error', token: resultToken, error: 'network' });
      return;
    }

    setStage({ kind: 'posting' });
    const res = await postResult({
      api: link.api,
      token: resultToken,
      panelId: getOrCreatePanelId(storage),
      state: finished,
    });

    if (!res.ok) {
      // The contest itself is untouched. Whatever happens next, the panel
      // does not discard a result it has and the server has not.
      setStage({ kind: 'result-error', token: resultToken, error: res.error });
      return;
    }

    if (res.nextToken === null) {
      // Clear the session, or tomorrow's entry link would find this table
      // still holding a contest that ended today.
      clearSession(storage);
      setBound(false);
      setPrefill(null);
      setStage({ kind: 'done' });
      return;
    }

    saveSession(storage, { api: link.api, token: res.nextToken });
    // The bout just reported must not come back as a resume of the ticket
    // that replaces it. Without this, a reload here would find a finished
    // contest saved under a session whose token now matches the *next*
    // bout, and offer to continue last bout's score as this one.
    persist(createInitialState());
    await runNextClaim(res.nextToken);
  }

  /**
   * Take the next contest for this mat. The same host, already confirmed —
   * the operator is not asked again, and the token never reaches the
   * address bar. A PIN is asked for again only if this claim says so.
   */
  async function runNextClaim(nextToken: string, pin?: string): Promise<void> {
    if (link.kind !== 'ok') return;
    const storage = panelStorage();
    if (!storage) {
      setStage({ kind: 'next-error', token: nextToken, error: 'network' });
      return;
    }

    setStage({ kind: 'next', token: nextToken });
    const claim = await claimContest({
      api: link.api,
      token: nextToken,
      panelId: getOrCreatePanelId(storage),
      pin,
    });

    if (claim.ok) {
      setPrefill(claim.contest);
      setToken(nextToken);
      setStage({ kind: 'running' });
      // A new contest, not a continuation of the last one: 'fresh' and a
      // new epoch together rebuild the store at createInitialState, so the
      // panel arrives at the setup form seeded from `prefill` alone.
      // NEW_MATCH would not do: it carries the previous bout's category
      // and round into engine state.
      setChoice('fresh');
      setStoreEpoch((n) => n + 1);
      return;
    }

    if (claim.error === 'pin_required' || claim.error === 'pin_invalid') {
      setStage({ kind: 'pin', token: nextToken, next: true, invalid: claim.error === 'pin_invalid' });
      return;
    }
    setStage({ kind: 'next-error', token: nextToken, error: claim.error });
  }

  /**
   * Take the contest. The only place in the app that starts a request for
   * contest data, and it is reachable only from a button the operator
   * pressed after reading the host's name.
   *
   * Called again with a PIN when the server asks for one, and again on
   * Retry. A repeat claim from the same panelId is a 200, so none of that
   * costs the table its contest.
   */
  async function runClaim(claimToken: string, pin?: string): Promise<void> {
    if (link.kind !== 'ok') return;
    const storage = panelStorage();
    // No localStorage means no panelId to own the contest with, and no way
    // to remember the ticket across a reload. Better to stay standalone
    // than to claim a contest this browser cannot hold on to.
    if (!storage) {
      setStage({ kind: 'claim-error', token: claimToken, error: 'network' });
      return;
    }

    setStage({ kind: 'claiming' });
    const claim = await claimContest({
      api: link.api,
      token: claimToken,
      panelId: getOrCreatePanelId(storage),
      pin,
    });

    if (claim.ok) {
      saveSession(storage, { api: link.api, token: claimToken });
      setPrefill(claim.contest);
      setBound(true);
      setStage({ kind: 'running' });
      // Decided from the session read on mount, never from the one just
      // written: a table claiming for the first time would otherwise see
      // its own fresh session agree with the token and offer to resume
      // whatever standalone bout this laptop happened to be left on.
      setChoice(serverResumable(saved, link, sessionAtLoad, claimToken) ? null : 'fresh');
      return;
    }

    if (claim.error === 'pin_required' || claim.error === 'pin_invalid') {
      setStage({ kind: 'pin', token: claimToken, next: false, invalid: claim.error === 'pin_invalid' });
      return;
    }
    setStage({ kind: 'claim-error', token: claimToken, error: claim.error });
  }

  /**
   * "Continue without server", from any of the gates above. The panel
   * becomes the standalone app it is without a link: nothing claimed, so
   * nothing owed, so nothing will be posted later either.
   */
  function declineServer(): void {
    setStage({ kind: 'off' });
    setBound(false);
    setPrefill(null);
    setChoice((current) => current ?? (standaloneResumable ? null : 'fresh'));
  }

  /**
   * Everything the panel dispatches goes through here, so that NEW_MATCH —
   * the one action that throws a contest away — cannot be used to walk out
   * of a contest this table still owes a report for.
   *
   * Before a result has been accepted, NEW_MATCH is allowed and means what
   * it always meant: back to the setup form. The form comes back filled
   * from `prefill`, because the ticket is unchanged and this table must not
   * report a bout it made up.
   *
   * Between the report and the next contest it does nothing at all. Loading
   * the next bout is the server's answer to arrange, not a blank match.
   *
   * The keyboard path below deliberately still writes straight to the
   * store: no key is bound to NEW_MATCH, so there is nothing here for it
   * to gate.
   */
  function dispatch(action: Action): void {
    const target = store ?? IDLE_STORE;
    if (action.type !== 'NEW_MATCH' || !bound || stage.kind === 'running') {
      target.dispatch(action);
    }
  }

  // The server gates come first. Until the operator is through them there
  // may be no store at all, and there must be no fetch.
  if (stage.kind === 'link') {
    return <LinkNotice kind={stage.link} onContinue={() => setStage({ kind: 'off' })} />;
  }
  if (stage.kind === 'confirm' && link.kind === 'ok') {
    return (
      <ConfirmHost
        host={link.host}
        onConfirm={() => void runClaim(token)}
        onDecline={declineServer}
      />
    );
  }
  if (stage.kind === 'claiming') return <ServerBusy title="Loading contest…" />;
  if (stage.kind === 'pin' && link.kind === 'ok') {
    const { token: pinToken, next } = stage;
    return (
      <PinPrompt
        host={link.host}
        invalid={stage.invalid}
        onSubmit={(pin) => void (next ? runNextClaim(pinToken, pin) : runClaim(pinToken, pin))}
        onDecline={declineServer}
      />
    );
  }
  if (stage.kind === 'claim-error') {
    const errorToken = stage.token;
    return (
      <ClaimError
        error={stage.error}
        onRetry={() => void runClaim(errorToken)}
        onDecline={declineServer}
      />
    );
  }

  // The contest is over. These sit in front of the finished panel rather
  // than replacing it: the store is untouched behind them, so dismissing
  // any of them puts the operator back on the contest as it ended.
  if (stage.kind === 'posting') return <ServerBusy title="Sending the result…" />;
  if (stage.kind === 'next') return <ServerBusy title="Loading next contest…" />;
  if (stage.kind === 'result-error') {
    const failedToken = stage.token;
    return (
      <ResultError
        stage="result"
        error={stage.error}
        onRetry={() => void runResult(stateRef.current, failedToken)}
        onDismiss={declineServer}
      />
    );
  }
  if (stage.kind === 'next-error') {
    const failedToken = stage.token;
    return (
      <ResultError
        stage="next"
        error={stage.error}
        onRetry={() => void runNextClaim(failedToken)}
        onDismiss={declineServer}
      />
    );
  }
  if (stage.kind === 'done') return <QueueDone onDismiss={() => setStage({ kind: 'off' })} />;

  // Waiting on the operator to say whether a saved contest should be
  // resumed. `choice === null` guarantees `resumeTarget` is non-null here
  // for every path that can reach this line.
  if (choice === null && resumeTarget) {
    const white = resumeTarget.white.name || 'White';
    const blue = resumeTarget.blue.name || 'Blue';
    return (
      <div className="entry entry--notice">
        <div className="entry__inner">
          <div className="card notice">
            <JudoMark />
            <p className="entry__eyebrow">Interrupted</p>
            <h1 className="entry__title">Resume the contest?</h1>
            <p className="notice__bout">
              <span>{white}</span>
              <span className="notice__vs">vs</span>
              <span>{blue}</span>
            </p>
            {resumeTarget.category && (
              <p className="notice__category">{resumeTarget.category}</p>
            )}
            <p className="notice__clock">{clockText(resumeTarget, now)}</p>
            <div className="notice__actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setChoice('resume')}
              >
                Resume contest
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  // Overwrite the saved contest now, not just in memory — a
                  // second reload before any score is dispatched must not ask
                  // about a contest the operator already dismissed. In server
                  // mode this throws nothing away either: the claimed contest
                  // lives in `prefill`, and the ticket in the session.
                  persist(createInitialState());
                  setChoice('fresh');
                }}
              >
                Start fresh
              </button>
            </div>
          </div>
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
      <div className="entry entry--notice">
        <div className="entry__inner">
          <div className="card notice">
            <JudoMark />
            <p className="entry__eyebrow">Already running</p>
            <h1 className="entry__title">A panel is already open</h1>
            <p className="entry__lede">
              Only one panel can run a contest. Open this tab as the scoreboard
              instead, or close the other panel and reload this page.
            </p>
            <div className="notice__actions">
              <a className="btn btn--ghost" href="?role=scoreboard">
                Open as scoreboard
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === 'setup') {
    // Keyed by the contest, so the next bout of the day arrives as a new
    // form rather than as a prop change the field useStates would ignore.
    // Empty, and so constant, for every standalone contest.
    return <MatchSetup key={token} state={state} dispatch={dispatch} prefill={prefill} />;
  }

  return <ControlPanel state={state} dispatch={dispatch} now={now} />;
}
