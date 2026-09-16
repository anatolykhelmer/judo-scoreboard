import { osaekomiElapsed } from '../../../engine/clock';
import type { Osaekomi, Side } from '../../../engine/matchState';
import { OSAEKOMI_IPPON_MS } from '../../../engine/rules';

/**
 * How far this side's band is filled while it holds — 0 to 1, or null when
 * this side is not the one holding and the band draws nothing at all.
 *
 * The scale is the hold's share of the twenty seconds that make it an ippon,
 * so a full band and the end of the contest are the same instant. Taken from
 * OSAEKOMI_IPPON_MS rather than written out, so a change to the rule moves
 * the band with it.
 *
 * Clamped at 1 because the hold can outlive the threshold: the engine awards
 * the ippon on the next TICK, not on the millisecond, and in the extension
 * case the clock sits at 00:00 while the hold runs on.
 */
export function holdFill(o: Osaekomi, side: Side, now: number): number | null {
  if (o.side !== side) return null;
  return Math.min(1, osaekomiElapsed(o, now) / OSAEKOMI_IPPON_MS);
}
