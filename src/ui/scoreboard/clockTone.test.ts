import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../engine/matchState';
import type { MatchState, Phase } from '../../engine/matchState';
import { clockTone } from './clockTone';

function state(over: Partial<MatchState> = {}): MatchState {
  return { ...createInitialState(), phase: 'ready' as Phase, ...over };
}

describe('clockTone', () => {
  it('is green on a board waiting for hajime', () => {
    expect(clockTone(state())).toBe('green');
  });

  it('is green while the contest runs', () => {
    expect(clockTone(state({ phase: 'fighting' }))).toBe('green');
  });

  it('is red at mate', () => {
    expect(clockTone(state({ phase: 'paused' }))).toBe('red');
  });

  it('is yellow in golden score', () => {
    expect(clockTone(state({ phase: 'fighting', goldenScore: true }))).toBe('yellow');
  });

  it('is red at mate in golden score — a stopped clock outranks the period', () => {
    expect(clockTone(state({ phase: 'paused', goldenScore: true }))).toBe('red');
  });

  // Regulation ran out with a hold still on: the engine leaves the phase
  // fighting because only the osaekomi can still change the result, and the
  // board must not imply the contest is over.
  it('stays green when regulation expired under a hold', () => {
    const s = state({
      phase: 'fighting',
      clock: { running: false, startedAt: null, elapsedMs: 120_000 },
    });
    expect(clockTone(s)).toBe('green');
  });

  it('is not red once the contest is finished', () => {
    expect(clockTone(state({ phase: 'finished' }))).toBe('green');
  });

  it('is yellow when a finished contest ended in golden score', () => {
    expect(clockTone(state({ phase: 'finished', goldenScore: true }))).toBe('yellow');
  });
});
