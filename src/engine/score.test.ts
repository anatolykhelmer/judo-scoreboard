import { describe, expect, it } from 'vitest';
import { createSideState } from './matchState';
import type { SideState } from './matchState';
import { compositeScore, scoreText } from './score';

function side(over: Partial<SideState> = {}): SideState {
  return { ...createSideState('Ivanov'), ...over };
}

describe('compositeScore', () => {
  it('is zero for a clean sheet', () => {
    expect(compositeScore(side())).toBe(0);
  });

  it('counts each yuko as one', () => {
    expect(compositeScore(side({ yuko: 1 }))).toBe(1);
    expect(compositeScore(side({ yuko: 2 }))).toBe(2);
  });

  it('counts a waza-ari as ten', () => {
    expect(compositeScore(side({ wazaari: 1 }))).toBe(10);
  });

  it('reads a waza-ari and a yuko as eleven', () => {
    expect(compositeScore(side({ wazaari: 1, yuko: 1 }))).toBe(11);
  });
});

describe('scoreText', () => {
  it('prints the composite number', () => {
    expect(scoreText(side({ wazaari: 1, yuko: 1 }))).toBe('11');
  });

  it('prints IPPON as a word for a direct ippon', () => {
    expect(scoreText(side({ ippon: true }))).toBe('IPPON');
  });

  it('prints IPPON for waza-ari-awasete-ippon', () => {
    expect(scoreText(side({ wazaari: 2 }))).toBe('IPPON');
  });

  it('lets an ippon outrank the yuko already on the board', () => {
    expect(scoreText(side({ ippon: true, yuko: 3 }))).toBe('IPPON');
  });
});
