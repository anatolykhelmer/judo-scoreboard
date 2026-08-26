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
