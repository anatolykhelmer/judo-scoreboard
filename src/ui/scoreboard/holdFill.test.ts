import { describe, expect, it } from 'vitest';
import type { Osaekomi } from '../../engine/matchState';
import { holdFill } from './holdFill';

function hold(side: Osaekomi['side'], elapsedMs: number): Osaekomi {
  return { side, startedAt: null, elapsedMs, awarded: 'none' };
}

describe('holdFill', () => {
  it('draws nothing when no one is holding', () => {
    expect(holdFill(hold(null, 0), 'white', 0)).toBeNull();
  });

  it('draws nothing on the band of the athlete being held', () => {
    expect(holdFill(hold('white', 9_000), 'blue', 0)).toBeNull();
  });

  it('fills the holding athlete\'s band in proportion to the hold', () => {
    expect(holdFill(hold('white', 0), 'white', 0)).toBe(0);
    expect(holdFill(hold('white', 9_000), 'white', 0)).toBeCloseTo(0.45);
    expect(holdFill(hold('white', 20_000), 'white', 0)).toBe(1);
  });

  it('stops at a full band when the hold runs past the ippon', () => {
    expect(holdFill(hold('blue', 25_000), 'blue', 0)).toBe(1);
  });

  it('counts the time since the hold started', () => {
    const running = { ...hold('blue', 2_000), startedAt: 1_000 };
    expect(holdFill(running, 'blue', 5_000)).toBeCloseTo(0.3);
  });
});
