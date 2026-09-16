import { useEffect, useState } from 'react';
import { elapsed, formatCountdown, formatCountUp, remaining } from '../engine/clock';
import type { MatchState } from '../engine/matchState';

export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Regulation counts down; golden score counts up. */
export function clockText(state: MatchState, now: number): string {
  return state.goldenScore
    ? formatCountUp(elapsed(state.clock, now))
    : formatCountdown(remaining(state, now));
}

/**
 * The same clock with the minutes' leading zero dropped — "0:20", not
 * "00:20". That is how the IJF venue board prints it; the modern board keeps
 * the padded form, so this is a second formatter rather than a change to
 * clockText or to the engine's mmss().
 *
 * The pattern only matches the pad mmss() adds — a leading zero followed by
 * another digit and the colon. A two-digit minute ("10:05") and an already
 * unpadded string (":20" can never be produced) are both left alone.
 */
export function clockTextShort(state: MatchState, now: number): string {
  return clockText(state, now).replace(/^0(\d:)/, '$1');
}
