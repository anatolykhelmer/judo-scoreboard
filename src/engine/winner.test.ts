import { describe, expect, it } from 'vitest';
import { createInitialState, createSideState } from './matchState';
import type { MatchState, SideState } from './matchState';
import { decideOnTime, scoreOutcome, terminalFromShido } from './winner';

function stateWith(white: Partial<SideState>, blue: Partial<SideState>): MatchState {
  return {
    ...createInitialState(),
    white: { ...createSideState('White'), ...white },
    blue: { ...createSideState('Blue'), ...blue },
  };
}

describe('decideOnTime', () => {
  it('ranks waza-ari above any number of yuko', () => {
    expect(decideOnTime(stateWith({ wazaari: 1 }, { yuko: 10 }))).toEqual({
      side: 'white',
      reason: 'waza-ari',
    });
  });

  it('falls through to yuko when waza-ari are level', () => {
    expect(decideOnTime(stateWith({ wazaari: 1, yuko: 1 }, { wazaari: 1, yuko: 2 }))).toEqual({
      side: 'blue',
      reason: 'yuko',
    });
  });

  it('returns null on a complete tie, sending the contest to golden score', () => {
    expect(decideOnTime(stateWith({ yuko: 2 }, { yuko: 2 }))).toBeNull();
  });

  it('puts ippon above everything', () => {
    expect(decideOnTime(stateWith({ ippon: true }, { wazaari: 1, yuko: 5 }))).toEqual({
      side: 'white',
      reason: 'ippon',
    });
  });
});

describe('terminalFromShido', () => {
  it('gives the contest to the opponent on the third shido', () => {
    expect(terminalFromShido(stateWith({ shido: 3 }, {}))).toEqual({
      side: 'blue',
      reason: 'hansoku-make',
    });
  });

  it('ignores one and two shido', () => {
    expect(terminalFromShido(stateWith({ shido: 2 }, { shido: 2 }))).toBeNull();
  });
});

describe('scoreOutcome', () => {
  it('ends the contest on a direct ippon', () => {
    const after = { ...createSideState(), ippon: true };
    expect(scoreOutcome('white', 'ippon', after, false)).toEqual({
      side: 'white',
      reason: 'ippon',
    });
  });

  it('ends the contest when a second waza-ari lands', () => {
    const after = { ...createSideState(), wazaari: 2 };
    expect(scoreOutcome('blue', 'wazaari', after, false)).toEqual({
      side: 'blue',
      reason: 'waza-ari-awasete-ippon',
    });
  });

  it('does not end regulation time on a first waza-ari', () => {
    const after = { ...createSideState(), wazaari: 1 };
    expect(scoreOutcome('blue', 'wazaari', after, false)).toBeNull();
  });

  it('does not end regulation time on a yuko', () => {
    const after = { ...createSideState(), yuko: 3 };
    expect(scoreOutcome('white', 'yuko', after, false)).toBeNull();
  });

  it('ends golden score on a yuko', () => {
    const after = { ...createSideState(), yuko: 1 };
    expect(scoreOutcome('white', 'yuko', after, true)).toEqual({
      side: 'white',
      reason: 'yuko',
    });
  });

  it('ends golden score on a first waza-ari', () => {
    const after = { ...createSideState(), wazaari: 1 };
    expect(scoreOutcome('blue', 'wazaari', after, true)).toEqual({
      side: 'blue',
      reason: 'waza-ari',
    });
  });
});
