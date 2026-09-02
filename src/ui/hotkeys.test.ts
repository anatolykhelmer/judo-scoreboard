import { describe, expect, it } from 'vitest';
import { reduce } from '../engine/matchEngine';
import { createInitialState } from '../engine/matchState';
import type { MatchState } from '../engine/matchState';
import { commandForKey, commandToAction } from './hotkeys';

const T0 = 1_000_000;

function fighting(): MatchState {
  const ready = reduce(
    createInitialState(),
    {
      type: 'SETUP_MATCH', white: 'A', blue: 'B', category: '',
      durationMs: 120_000, swapSides: false, logoDataUrl: null,
      theme: 'modern', round: '', whiteCountry: 'IJF', blueCountry: 'IJF',
    },
    T0,
  );
  return reduce(ready, { type: 'HAJIME' }, T0);
}

describe('commandForKey', () => {
  it('maps 1-5 to white and 6-0 to blue', () => {
    expect(commandForKey('1')).toEqual({ kind: 'score', side: 'white', scoreType: 'yuko' });
    expect(commandForKey('3')).toEqual({ kind: 'score', side: 'white', scoreType: 'ippon' });
    expect(commandForKey('4')).toEqual({ kind: 'shido', side: 'white' });
    expect(commandForKey('5')).toEqual({ kind: 'toggle-osaekomi', side: 'white' });
    expect(commandForKey('6')).toEqual({ kind: 'score', side: 'blue', scoreType: 'yuko' });
    expect(commandForKey('0')).toEqual({ kind: 'toggle-osaekomi', side: 'blue' });
  });

  it('maps space to the clock and ignores anything else', () => {
    expect(commandForKey(' ')).toEqual({ kind: 'toggle-clock' });
    expect(commandForKey('x')).toBeNull();
  });
});

describe('commandToAction', () => {
  it('turns space into mate while fighting and hajime otherwise', () => {
    expect(commandToAction({ kind: 'toggle-clock' }, fighting())).toEqual({ type: 'MATE' });
    const paused = reduce(fighting(), { type: 'MATE' }, T0 + 1000);
    expect(commandToAction({ kind: 'toggle-clock' }, paused)).toEqual({ type: 'HAJIME' });
  });

  it('turns the osaekomi key into toketa for the side already held', () => {
    const held = reduce(fighting(), { type: 'OSAEKOMI_START', side: 'white' }, T0);
    expect(commandToAction({ kind: 'toggle-osaekomi', side: 'white' }, held)).toEqual({
      type: 'TOKETA',
    });
    expect(commandToAction({ kind: 'toggle-osaekomi', side: 'blue' }, held)).toEqual({
      type: 'OSAEKOMI_START',
      side: 'blue',
    });
  });
});
