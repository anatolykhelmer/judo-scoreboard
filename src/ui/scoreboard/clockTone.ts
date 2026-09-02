import type { MatchState } from '../../engine/matchState';

export type ClockTone = 'green' | 'yellow' | 'red';

/**
 * What colour the IJF board's clock burns.
 *
 * A project convention, not a regulation: the SOR specifies the scoreboard's
 * content and nothing about colour, and the reference footage shows golden
 * score red at one event and green at another. See the spec, section 4.4.
 *
 * Keyed on `phase` rather than on `clock.running`, which matters twice.
 * Before hajime the board shows a green 4:00, as the footage does between
 * contests — `ready` has a stopped clock but is not mate. And when regulation
 * expires under a hold the engine leaves the phase `fighting`, so the board
 * stays green: the contest is still live, and only the osaekomi can decide it.
 *
 * Pause outranks golden score because "the clock is not running" is the more
 * urgent fact for the mat. Which period it is stays legible from the GOLDEN
 * SCORE label under the digits, so nothing is lost by the precedence.
 */
export function clockTone(state: MatchState): ClockTone {
  if (state.phase === 'paused') return 'red';
  if (state.goldenScore) return 'yellow';
  return 'green';
}
