import { describe, expect, it } from 'vitest';
import { createInitialState, createSideState } from '../engine/matchState';
import { buildResultBody, parseContestPayload, parseNextToken } from './payload';

const valid = {
  version: 1,
  contest: {
    white: { name: 'KOGA Toshihiko', country: 'JPN' },
    blue: { name: 'DOUILLET David' },
    category: '-71 kg',
    durationMs: 240000,
    round: 'FINAL',
  },
};

describe('parseContestPayload', () => {
  it('reads version 1 and fills defaults', () => {
    expect(parseContestPayload(valid)).toEqual({
      white: { name: 'KOGA Toshihiko', country: 'JPN' },
      blue: { name: 'DOUILLET David', country: 'IJF' },
      category: '-71 kg',
      durationMs: 240000,
      round: 'FINAL',
    });
  });

  it('rejects the wrong version, empty names, and non-positive duration', () => {
    expect(parseContestPayload({ ...valid, version: 2 })).toBeNull();
    expect(parseContestPayload({
      version: 1,
      contest: { ...valid.contest, white: { name: '  ' } },
    })).toBeNull();
    expect(parseContestPayload({
      version: 1,
      contest: { ...valid.contest, durationMs: 0 },
    })).toBeNull();
  });

  it('ignores a result URL field', () => {
    expect(parseContestPayload({ ...valid, resultUrl: 'https://evil.example' })).toEqual(
      parseContestPayload(valid),
    );
  });
});

describe('parseNextToken', () => {
  it('reads a token, null, and rejects junk', () => {
    expect(parseNextToken({ nextToken: 'tok_next' })).toBe('tok_next');
    expect(parseNextToken({ nextToken: null })).toBeNull();
    expect(parseNextToken({ nextToken: 'a/b' })).toBeUndefined();
    expect(parseNextToken({})).toBeUndefined();
    expect(parseNextToken({ nextUrl: 'https://evil.example' })).toBeUndefined();
  });
});

describe('buildResultBody', () => {
  it('sends version, panelId and the finished winner report', () => {
    const state = {
      ...createInitialState(),
      category: '-71 kg',
      durationMs: 240000,
      round: 'FINAL',
      goldenScore: false,
      phase: 'finished' as const,
      clock: { running: false, startedAt: null, elapsedMs: 125000 },
      white: { ...createSideState('KOGA Toshihiko', 'JPN'), ippon: true },
      blue: { ...createSideState('DOUILLET David', 'FRA'), shido: 1 },
      winner: {
        side: 'white' as const,
        reason: 'ippon' as const,
        causedBy: { side: 'white' as const, type: 'ippon' as const },
      },
    };
    expect(buildResultBody('panel-1', state)).toEqual({
      version: 1,
      panelId: 'panel-1',
      result: {
        winner: state.winner,
        white: { name: 'KOGA Toshihiko', country: 'JPN', ippon: true, wazaari: 0, yuko: 0, shido: 0 },
        blue: { name: 'DOUILLET David', country: 'FRA', ippon: false, wazaari: 0, yuko: 0, shido: 1 },
        goldenScore: false,
        elapsedMs: 125000,
        durationMs: 240000,
        category: '-71 kg',
        round: 'FINAL',
      },
    });
  });
});
