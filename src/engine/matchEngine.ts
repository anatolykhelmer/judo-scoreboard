import { elapsed, osaekomiElapsed, osaekomiLevel } from './clock';
import type { MatchState, ScoreType, Side, SideState, Winner } from './matchState';
import { createInitialState, createSideState } from './matchState';
import { MAX_SHIDO, MAX_WAZAARI } from './rules';
import type { Outcome } from './winner';
import { decideOnTime, scoreOutcome, terminalFromShido } from './winner';

export type Action =
  | {
      type: 'SETUP_MATCH';
      white: string;
      blue: string;
      category: string;
      durationMs: number;
      swapSides: boolean;
      logoDataUrl: string | null;
    }
  | { type: 'HAJIME' }
  | { type: 'MATE' }
  | { type: 'SCORE'; side: Side; scoreType: ScoreType }
  | { type: 'UNSCORE'; side: Side; scoreType: ScoreType }
  | { type: 'SHIDO'; side: Side }
  | { type: 'UNSHIDO'; side: Side }
  | { type: 'OSAEKOMI_START'; side: Side }
  | { type: 'TOKETA' }
  | { type: 'TICK' }
  | { type: 'RESET_SCORES' }
  | { type: 'NEW_MATCH' };

function withSide(s: MatchState, side: Side, next: SideState): MatchState {
  return side === 'white' ? { ...s, white: next } : { ...s, blue: next };
}

function stopClock(s: MatchState, now: number): MatchState {
  if (!s.clock.running) return s;
  return {
    ...s,
    clock: { running: false, startedAt: null, elapsedMs: elapsed(s.clock, now) },
  };
}

function clearOsaekomi(s: MatchState): MatchState {
  if (s.osaekomi.side === null) return s;
  return { ...s, osaekomi: { side: null, startedAt: null, elapsedMs: 0, awarded: 'none' } };
}

function finish(
  s: MatchState,
  outcome: Outcome,
  causedBy: Winner['causedBy'],
  now: number,
): MatchState {
  const settled = clearOsaekomi(stopClock(s, now));
  return { ...settled, phase: 'finished', winner: { ...outcome, causedBy } };
}

function regulationExpired(s: MatchState, now: number): boolean {
  return !s.goldenScore && elapsed(s.clock, now) >= s.durationMs;
}

/** Regulation time is over and no hold is in progress: decide, or go to golden score. */
function resolveExpiry(s: MatchState, now: number): MatchState {
  const stopped = stopClock(s, now);
  const outcome = decideOnTime(stopped);
  if (outcome) {
    return { ...stopped, phase: 'finished', winner: { ...outcome, causedBy: null } };
  }
  return {
    ...stopped,
    goldenScore: true,
    clock: { running: false, startedAt: null, elapsedMs: 0 },
    phase: 'paused',
    winner: null,
  };
}

function addScore(s: MatchState, side: Side, scoreType: ScoreType): MatchState {
  const cur = s[side];
  if (scoreType === 'ippon') {
    if (cur.ippon) return s;
    return withSide(s, side, { ...cur, ippon: true });
  }
  if (scoreType === 'wazaari') {
    const next = Math.min(MAX_WAZAARI, cur.wazaari + 1);
    return next === cur.wazaari ? s : withSide(s, side, { ...cur, wazaari: next });
  }
  return withSide(s, side, { ...cur, yuko: cur.yuko + 1 });
}

function removeScore(s: MatchState, side: Side, scoreType: ScoreType): MatchState {
  const cur = s[side];
  if (scoreType === 'ippon') {
    if (!cur.ippon) return s;
    return withSide(s, side, { ...cur, ippon: false });
  }
  if (scoreType === 'wazaari') {
    const next = Math.max(0, cur.wazaari - 1);
    return next === cur.wazaari ? s : withSide(s, side, { ...cur, wazaari: next });
  }
  const next = Math.max(0, cur.yuko - 1);
  return next === cur.yuko ? s : withSide(s, side, { ...cur, yuko: next });
}

function applyScore(s: MatchState, side: Side, scoreType: ScoreType, now: number): MatchState {
  const scored = addScore(s, side, scoreType);
  const outcome = scoreOutcome(side, scoreType, scored[side], scored.goldenScore);
  return outcome ? finish(scored, outcome, { side, type: scoreType }, now) : scored;
}

/**
 * Advance a hold to whatever level its elapsed time now implies.
 * The score already granted by this same hold is replaced, not added to, so a
 * tick that skips a whole window still lands on the right score.
 */
function tickOsaekomi(s: MatchState, now: number): MatchState {
  const side = s.osaekomi.side;
  if (side === null) return s;

  const level = osaekomiLevel(osaekomiElapsed(s.osaekomi, now));
  if (level === 'none' || level === s.osaekomi.awarded) return s;

  let next = s.osaekomi.awarded === 'none' ? s : removeScore(s, side, s.osaekomi.awarded);
  next = { ...next, osaekomi: { ...next.osaekomi, awarded: level } };
  return applyScore(next, side, level, now);
}

/**
 * After a score or shido has been taken back, decide whether the contest reopens.
 * A winner produced by one action is undone by removing that action; a winner
 * produced by the clock is recomputed from whatever the score is now.
 *
 * A tie that has already moved the contest into golden score is a special case:
 * if hajime has not yet been given for golden score (uniquely identified by
 * goldenScore === true, phase === 'paused', clock stopped at elapsedMs === 0),
 * the correction may reveal that regulation was in fact decisive, so it is
 * re-derived from decideOnTime. Once hajime has been called for golden score,
 * the contest is genuinely under way and is never retroactively undone.
 */
function afterCorrection(
  s: MatchState,
  side: Side,
  type: ScoreType | 'shido',
  now: number,
): MatchState {
  const w = s.winner;
  if (!w) {
    const goldenScoreNotYetStarted =
      s.goldenScore && s.phase === 'paused' && !s.clock.running && s.clock.elapsedMs === 0;
    if (!goldenScoreNotYetStarted) return s;
    const outcome = decideOnTime(s);
    return outcome
      ? { ...s, goldenScore: false, phase: 'finished', winner: { ...outcome, causedBy: null } }
      : s;
  }
  if (w.causedBy) {
    return w.causedBy.side === side && w.causedBy.type === type
      ? { ...s, winner: null, phase: 'paused' }
      : s;
  }
  return resolveExpiry({ ...s, winner: null }, now);
}

export function reduce(state: MatchState, action: Action, now: number): MatchState {
  switch (action.type) {
    case 'SETUP_MATCH':
      return {
        ...createInitialState(),
        category: action.category,
        durationMs: action.durationMs,
        white: createSideState(action.white),
        blue: createSideState(action.blue),
        swapSides: action.swapSides,
        logoDataUrl: action.logoDataUrl,
        phase: 'ready',
      };

    case 'HAJIME': {
      if (state.phase !== 'ready' && state.phase !== 'paused') return state;
      return {
        ...state,
        clock: { running: true, startedAt: now, elapsedMs: state.clock.elapsedMs },
        phase: 'fighting',
      };
    }

    case 'MATE': {
      if (state.phase !== 'fighting') return state;
      // Settle the hold before releasing it. A threshold crossed between the
      // last tick and this call would otherwise be thrown away with the hold:
      // normally that window is one tick, but a panel tab hidden behind
      // another in the same window has its setInterval throttled to 1 Hz by
      // Chrome, which makes it a whole second. This is the one place the app
      // could lose a score the athlete had already earned.
      const settled = tickOsaekomi(state, now);
      // A promotion that ends the contest has already stopped the clock,
      // released the hold and recorded the winner. Nothing further applies —
      // running on would let resolveExpiry overwrite that outcome.
      if (settled.phase === 'finished') return settled;
      const stopped = clearOsaekomi(stopClock(settled, now));
      if (regulationExpired(stopped, now)) return resolveExpiry(stopped, now);
      return { ...stopped, phase: 'paused' };
    }

    case 'SCORE': {
      if (state.phase === 'setup' || state.phase === 'finished') return state;
      return applyScore(state, action.side, action.scoreType, now);
    }

    case 'UNSCORE': {
      if (state.phase === 'setup') return state;
      const reduced = removeScore(state, action.side, action.scoreType);
      // Nothing came off the board, so nothing downstream can change either.
      // Without this, minus pressed on a count already at zero after a
      // contest decided on time still runs afterCorrection -> resolveExpiry,
      // which rebuilds a content-identical state: a fresh object reference
      // costs a redundant persist and a redundant broadcast. UNSHIDO has had
      // the equivalent zero guard from the start. (A hold's `awarded` link is
      // only ever set for a score the hold actually put on the board, so
      // there is nothing to unlink when the count was already zero.)
      if (reduced === state) return state;
      const corrected =
        state.osaekomi.side === action.side && state.osaekomi.awarded === action.scoreType
          ? { ...reduced, osaekomi: { ...reduced.osaekomi, awarded: 'none' as const } }
          : reduced;
      return afterCorrection(corrected, action.side, action.scoreType, now);
    }

    case 'SHIDO': {
      if (state.phase === 'setup' || state.phase === 'finished') return state;
      const cur = state[action.side];
      if (cur.shido >= MAX_SHIDO) return state;
      const bumped = withSide(state, action.side, { ...cur, shido: cur.shido + 1 });
      const outcome = terminalFromShido(bumped);
      return outcome ? finish(bumped, outcome, { side: action.side, type: 'shido' }, now) : bumped;
    }

    case 'UNSHIDO': {
      if (state.phase === 'setup') return state;
      const cur = state[action.side];
      if (cur.shido === 0) return state;
      const reduced = withSide(state, action.side, { ...cur, shido: cur.shido - 1 });
      return afterCorrection(reduced, action.side, 'shido', now);
    }

    case 'OSAEKOMI_START': {
      if (state.phase !== 'fighting' || state.osaekomi.side !== null) return state;
      return {
        ...state,
        osaekomi: { side: action.side, startedAt: now, elapsedMs: 0, awarded: 'none' },
      };
    }

    case 'TOKETA': {
      if (state.osaekomi.side === null) return state;
      // Same as MATE: the hold's own time is read before the hold is cleared,
      // so a threshold reached since the last tick is still awarded.
      const settled = tickOsaekomi(state, now);
      if (settled.phase === 'finished') return settled;
      const released = clearOsaekomi(settled);
      if (regulationExpired(released, now)) return resolveExpiry(released, now);
      return released;
    }

    case 'TICK': {
      if (state.phase !== 'fighting') return state;

      const held = tickOsaekomi(state, now);
      if (held.phase === 'finished') return held;

      if (regulationExpired(held, now)) {
        const stopped = stopClock(held, now);
        return stopped.osaekomi.side === null ? resolveExpiry(stopped, now) : stopped;
      }
      return held;
    }

    case 'RESET_SCORES':
      return {
        ...createInitialState(),
        category: state.category,
        durationMs: state.durationMs,
        white: createSideState(state.white.name),
        blue: createSideState(state.blue.name),
        swapSides: state.swapSides,
        logoDataUrl: state.logoDataUrl,
        phase: 'ready',
      };

    case 'NEW_MATCH':
      return {
        ...createInitialState(),
        category: state.category,
        durationMs: state.durationMs,
        swapSides: state.swapSides,
        logoDataUrl: state.logoDataUrl,
        phase: 'setup',
      };
  }
}
