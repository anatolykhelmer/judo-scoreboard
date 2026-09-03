import { describe, expect, it } from 'vitest';
import { createInitialState } from '../engine/matchState';
import type { MatchState } from '../engine/matchState';
import { clockText, clockTextShort } from './useNow';

const NOW = 1_000_000;

/** A stopped clock, so both formatters read straight off elapsedMs. */
function state(over: Partial<MatchState> = {}): MatchState {
  return {
    ...createInitialState(),
    clock: { running: false, startedAt: null, elapsedMs: 0 },
    ...over,
  };
}

/** Regulation, with `remainingMs` left to run. */
function countdown(remainingMs: number): MatchState {
  return state({
    durationMs: 240_000,
    clock: { running: false, startedAt: null, elapsedMs: 240_000 - remainingMs },
  });
}

/** Golden score, `elapsedMs` into the period. */
function countUp(elapsedMs: number): MatchState {
  return state({ goldenScore: true, clock: { running: false, startedAt: null, elapsedMs } });
}

describe('clockTextShort', () => {
  // The IJF venue board prints "0:20"; the modern board keeps clockText's
  // padded "00:20". Both formatters are checked side by side so a change to
  // the shared mmss() cannot quietly move only one of them.
  it('drops the minutes leading zero under ten minutes', () => {
    expect(clockText(countdown(20_000), NOW)).toBe('00:20');
    expect(clockTextShort(countdown(20_000), NOW)).toBe('0:20');
  });

  it('drops it for a non-zero single-digit minute too', () => {
    expect(clockText(countdown(251_000), NOW)).toBe('04:11');
    expect(clockTextShort(countdown(251_000), NOW)).toBe('4:11');
  });

  it('leaves a two-digit minute alone', () => {
    expect(clockTextShort(countUp(605_000), NOW)).toBe('10:05');
  });

  it('keeps both digits of the seconds', () => {
    expect(clockTextShort(countdown(65_000), NOW)).toBe('1:05');
  });

  it('never leaves a bare colon at time up', () => {
    expect(clockTextShort(countdown(0), NOW)).toBe('0:00');
  });

  it('counts up in golden score, same as clockText', () => {
    expect(clockTextShort(countUp(7_000), NOW)).toBe('0:07');
  });
});
