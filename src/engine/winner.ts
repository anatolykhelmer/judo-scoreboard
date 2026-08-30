import type { MatchState, ScoreType, Side, SideState, WinReason } from './matchState';
import { hasIppon, opposite } from './matchState';
import { MAX_SHIDO, MAX_WAZAARI } from './rules';

export interface Outcome {
  side: Side;
  reason: WinReason;
}

/**
 * Who wins once regulation time has run out.
 * Order: ippon, then waza-ari count, then yuko count.
 * null means level on all three — the contest goes to golden score.
 */
export function decideOnTime(state: MatchState): Outcome | null {
  const w = state.white;
  const b = state.blue;

  if (hasIppon(w) !== hasIppon(b)) {
    return { side: hasIppon(w) ? 'white' : 'blue', reason: 'ippon' };
  }
  if (w.wazaari !== b.wazaari) {
    return { side: w.wazaari > b.wazaari ? 'white' : 'blue', reason: 'waza-ari' };
  }
  if (w.yuko !== b.yuko) {
    return { side: w.yuko > b.yuko ? 'white' : 'blue', reason: 'yuko' };
  }
  return null;
}

/** The third shido is hansoku-make; the opponent wins immediately. */
export function terminalFromShido(state: MatchState): Outcome | null {
  if (state.white.shido >= MAX_SHIDO) return { side: opposite('white'), reason: 'hansoku-make' };
  if (state.blue.shido >= MAX_SHIDO) return { side: opposite('blue'), reason: 'hansoku-make' };
  return null;
}

/**
 * Whether a score that has just been applied ends the contest.
 * In golden score any score ends it; in regulation only ippon does,
 * whether scored directly or reached through two waza-ari.
 */
export function scoreOutcome(
  side: Side,
  scoreType: ScoreType,
  after: SideState,
  goldenScore: boolean,
): Outcome | null {
  if (scoreType === 'ippon') return { side, reason: 'ippon' };
  if (scoreType === 'wazaari' && after.wazaari >= MAX_WAZAARI) {
    return { side, reason: 'waza-ari-awasete-ippon' };
  }
  if (goldenScore) {
    return { side, reason: scoreType === 'wazaari' ? 'waza-ari' : 'yuko' };
  }
  return null;
}
