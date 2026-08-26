import { describe, expect, it } from 'vitest';
import {
  elapsed,
  formatCountdown,
  formatCountUp,
  formatOsaekomi,
  osaekomiLevel,
  remaining,
} from './clock';
import { createInitialState } from './matchState';

describe('elapsed', () => {
  it('returns accumulated time when the clock is stopped', () => {
    expect(elapsed({ running: false, startedAt: null, elapsedMs: 4200 }, 9_999)).toBe(4200);
  });

  it('adds time since start when the clock is running', () => {
    expect(elapsed({ running: true, startedAt: 1000, elapsedMs: 500 }, 3000)).toBe(2500);
  });
});

describe('remaining', () => {
  it('counts down from the contest duration', () => {
    const state = { ...createInitialState(), durationMs: 120_000 };
    state.clock = { running: true, startedAt: 0, elapsedMs: 0 };
    expect(remaining(state, 30_000)).toBe(90_000);
  });

  it('clamps at zero rather than going negative', () => {
    const state = { ...createInitialState(), durationMs: 120_000 };
    state.clock = { running: true, startedAt: 0, elapsedMs: 0 };
    expect(remaining(state, 500_000)).toBe(0);
  });
});

describe('formatCountdown', () => {
  it('rounds up so a countdown shows 02:00 for a full second', () => {
    expect(formatCountdown(120_000)).toBe('02:00');
    expect(formatCountdown(119_999)).toBe('02:00');
    expect(formatCountdown(119_000)).toBe('01:59');
  });

  it('reaches 00:00 only at exactly zero', () => {
    expect(formatCountdown(1)).toBe('00:01');
    expect(formatCountdown(0)).toBe('00:00');
  });
});

describe('formatCountUp', () => {
  it('rounds down', () => {
    expect(formatCountUp(0)).toBe('00:00');
    expect(formatCountUp(1999)).toBe('00:01');
    expect(formatCountUp(61_000)).toBe('01:01');
  });
});

describe('formatOsaekomi', () => {
  it('shows two digits of seconds', () => {
    expect(formatOsaekomi(0)).toBe('00');
    expect(formatOsaekomi(7400)).toBe('07');
    expect(formatOsaekomi(20_000)).toBe('20');
  });
});

describe('osaekomiLevel', () => {
  it('uses inclusive lower bounds', () => {
    expect(osaekomiLevel(4999)).toBe('none');
    expect(osaekomiLevel(5000)).toBe('yuko');
    expect(osaekomiLevel(9999)).toBe('yuko');
    expect(osaekomiLevel(10_000)).toBe('wazaari');
    expect(osaekomiLevel(19_999)).toBe('wazaari');
    expect(osaekomiLevel(20_000)).toBe('ippon');
  });
});
