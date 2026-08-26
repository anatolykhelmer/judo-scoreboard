import { beforeEach, describe, expect, it } from 'vitest';
import { reduce } from './matchEngine';
import type { Action } from './matchEngine';
import { createInitialState, hasIppon } from './matchState';
import type { MatchState } from './matchState';

const T0 = 1_000_000;

function setup(durationMs = 120_000): MatchState {
  return reduce(
    createInitialState(),
    {
      type: 'SETUP_MATCH',
      white: 'Ivanov',
      blue: 'Cohen',
      category: 'U15 -50',
      durationMs,
      swapSides: false,
      logoDataUrl: null,
    },
    T0,
  );
}

function run(state: MatchState, actions: Action[], now = T0): MatchState {
  return actions.reduce((s, a) => reduce(s, a, now), state);
}

describe('SETUP_MATCH', () => {
  it('stores the pair and becomes ready', () => {
    const s = setup();
    expect(s.phase).toBe('ready');
    expect(s.white.name).toBe('Ivanov');
    expect(s.blue.name).toBe('Cohen');
    expect(s.category).toBe('U15 -50');
    expect(s.clock).toEqual({ running: false, startedAt: null, elapsedMs: 0 });
  });
});

describe('HAJIME and MATE', () => {
  let ready: MatchState;
  beforeEach(() => { ready = setup(); });

  it('starts the clock', () => {
    const s = reduce(ready, { type: 'HAJIME' }, T0);
    expect(s.phase).toBe('fighting');
    expect(s.clock).toEqual({ running: true, startedAt: T0, elapsedMs: 0 });
  });

  it('accumulates elapsed time when mate is called', () => {
    const s = run(ready, [{ type: 'HAJIME' }]);
    const stopped = reduce(s, { type: 'MATE' }, T0 + 30_000);
    expect(stopped.phase).toBe('paused');
    expect(stopped.clock).toEqual({ running: false, startedAt: null, elapsedMs: 30_000 });
  });

  it('is a no-op once the contest is finished', () => {
    const finished = run(setup(), [
      { type: 'HAJIME' },
      { type: 'SCORE', side: 'white', scoreType: 'ippon' },
    ]);
    expect(reduce(finished, { type: 'HAJIME' }, T0)).toBe(finished);
  });
});

describe('scoring', () => {
  let fighting: MatchState;
  beforeEach(() => { fighting = run(setup(), [{ type: 'HAJIME' }]); });

  it('ends the contest on ippon and stops the clock', () => {
    const s = reduce(fighting, { type: 'SCORE', side: 'white', scoreType: 'ippon' }, T0 + 5_000);
    expect(s.phase).toBe('finished');
    expect(s.winner).toEqual({
      side: 'white',
      reason: 'ippon',
      causedBy: { side: 'white', type: 'ippon' },
    });
    expect(s.clock.running).toBe(false);
    expect(s.clock.elapsedMs).toBe(5_000);
  });

  it('lets the contest continue after a single waza-ari', () => {
    const s = reduce(fighting, { type: 'SCORE', side: 'blue', scoreType: 'wazaari' }, T0);
    expect(s.phase).toBe('fighting');
    expect(s.blue.wazaari).toBe(1);
    expect(hasIppon(s.blue)).toBe(false);
  });

  it('combines two waza-ari into ippon', () => {
    const s = run(fighting, [
      { type: 'SCORE', side: 'blue', scoreType: 'wazaari' },
      { type: 'SCORE', side: 'blue', scoreType: 'wazaari' },
    ]);
    expect(s.phase).toBe('finished');
    expect(s.winner?.reason).toBe('waza-ari-awasete-ippon');
    expect(s.blue.wazaari).toBe(2);
    expect(hasIppon(s.blue)).toBe(true);
    expect(s.blue.ippon).toBe(false);
  });

  it('never lets yuko end regulation time, however many are scored', () => {
    const actions: Action[] = Array.from({ length: 10 }, () => ({
      type: 'SCORE' as const, side: 'white' as const, scoreType: 'yuko' as const,
    }));
    const s = run(fighting, actions);
    expect(s.white.yuko).toBe(10);
    expect(s.phase).toBe('fighting');
    expect(s.winner).toBeNull();
  });
});

describe('golden score', () => {
  function inGoldenScore(): MatchState {
    const s = run(setup(), [{ type: 'HAJIME' }]);
    return reduce(s, { type: 'MATE' }, T0 + 120_000);
  }

  it('is entered on a tie at time expiry, with the clock reset', () => {
    const s = inGoldenScore();
    expect(s.goldenScore).toBe(true);
    expect(s.phase).toBe('paused');
    expect(s.clock).toEqual({ running: false, startedAt: null, elapsedMs: 0 });
  });

  it('ends on a yuko', () => {
    const gs = run(inGoldenScore(), [{ type: 'HAJIME' }]);
    const s = reduce(gs, { type: 'SCORE', side: 'blue', scoreType: 'yuko' }, T0);
    expect(s.phase).toBe('finished');
    expect(s.winner).toEqual({
      side: 'blue',
      reason: 'yuko',
      causedBy: { side: 'blue', type: 'yuko' },
    });
  });

  it('does not end on a single shido', () => {
    const gs = run(inGoldenScore(), [{ type: 'HAJIME' }]);
    const s = reduce(gs, { type: 'SHIDO', side: 'blue' }, T0);
    expect(s.phase).toBe('fighting');
    expect(s.winner).toBeNull();
  });

  it('carries regulation-time scores over', () => {
    const fighting = run(setup(), [{ type: 'HAJIME' }]);
    const scored = run(fighting, [
      { type: 'SCORE', side: 'white', scoreType: 'yuko' },
      { type: 'SCORE', side: 'blue', scoreType: 'yuko' },
      { type: 'SHIDO', side: 'white' },
    ]);
    const s = reduce(scored, { type: 'MATE' }, T0 + 120_000);
    expect(s.goldenScore).toBe(true);
    expect(s.white.yuko).toBe(1);
    expect(s.blue.yuko).toBe(1);
    expect(s.white.shido).toBe(1);
  });
});

describe('decision on time', () => {
  it('gives the contest to the higher yuko count with no causedBy', () => {
    const fighting = run(setup(), [{ type: 'HAJIME' }]);
    const scored = reduce(fighting, { type: 'SCORE', side: 'blue', scoreType: 'yuko' }, T0);
    const s = reduce(scored, { type: 'MATE' }, T0 + 120_000);
    expect(s.phase).toBe('finished');
    expect(s.winner).toEqual({ side: 'blue', reason: 'yuko', causedBy: null });
  });
});

describe('shido', () => {
  it('gives the contest to the opponent on the third', () => {
    const fighting = run(setup(), [{ type: 'HAJIME' }]);
    const s = run(fighting, [
      { type: 'SHIDO', side: 'white' },
      { type: 'SHIDO', side: 'white' },
      { type: 'SHIDO', side: 'white' },
    ]);
    expect(s.white.shido).toBe(3);
    expect(s.phase).toBe('finished');
    expect(s.winner).toEqual({
      side: 'blue',
      reason: 'hansoku-make',
      causedBy: { side: 'white', type: 'shido' },
    });
  });

  it('does not go past three', () => {
    const fighting = run(setup(), [{ type: 'HAJIME' }]);
    const three = run(fighting, [
      { type: 'SHIDO', side: 'white' },
      { type: 'SHIDO', side: 'white' },
      { type: 'SHIDO', side: 'white' },
    ]);
    expect(reduce(three, { type: 'SHIDO', side: 'white' }, T0)).toBe(three);
  });
});

describe('corrections', () => {
  it('reopens the contest when the deciding ippon is removed', () => {
    const finished = run(setup(), [
      { type: 'HAJIME' },
      { type: 'SCORE', side: 'white', scoreType: 'ippon' },
    ]);
    const s = reduce(finished, { type: 'UNSCORE', side: 'white', scoreType: 'ippon' }, T0);
    expect(s.phase).toBe('paused');
    expect(s.winner).toBeNull();
    expect(s.white.ippon).toBe(false);
  });

  it('clears the implied ippon when a waza-ari is taken back', () => {
    const finished = run(setup(), [
      { type: 'HAJIME' },
      { type: 'SCORE', side: 'blue', scoreType: 'wazaari' },
      { type: 'SCORE', side: 'blue', scoreType: 'wazaari' },
    ]);
    const s = reduce(finished, { type: 'UNSCORE', side: 'blue', scoreType: 'wazaari' }, T0);
    expect(s.blue.wazaari).toBe(1);
    expect(hasIppon(s.blue)).toBe(false);
    expect(s.phase).toBe('paused');
    expect(s.winner).toBeNull();
  });

  it('reopens the contest when the third shido is taken back', () => {
    const finished = run(setup(), [
      { type: 'HAJIME' },
      { type: 'SHIDO', side: 'white' },
      { type: 'SHIDO', side: 'white' },
      { type: 'SHIDO', side: 'white' },
    ]);
    const s = reduce(finished, { type: 'UNSHIDO', side: 'white' }, T0);
    expect(s.white.shido).toBe(2);
    expect(s.phase).toBe('paused');
    expect(s.winner).toBeNull();
  });

  it('re-decides a contest that had been won on time', () => {
    const fighting = run(setup(), [{ type: 'HAJIME' }]);
    const scored = reduce(fighting, { type: 'SCORE', side: 'blue', scoreType: 'yuko' }, T0);
    const decided = reduce(scored, { type: 'MATE' }, T0 + 120_000);
    expect(decided.winner?.side).toBe('blue');

    const corrected = reduce(
      decided,
      { type: 'UNSCORE', side: 'blue', scoreType: 'yuko' },
      T0 + 121_000,
    );
    expect(corrected.winner).toBeNull();
    expect(corrected.goldenScore).toBe(true);
    expect(corrected.phase).toBe('paused');
  });

  it('does not go below zero', () => {
    const fighting = run(setup(), [{ type: 'HAJIME' }]);
    const s = reduce(fighting, { type: 'UNSCORE', side: 'white', scoreType: 'yuko' }, T0);
    expect(s.white.yuko).toBe(0);
  });
});

describe('RESET_SCORES and NEW_MATCH', () => {
  it('reset keeps the pair and venue settings but clears the score', () => {
    const played = run(setup(), [
      { type: 'HAJIME' },
      { type: 'SCORE', side: 'white', scoreType: 'yuko' },
      { type: 'SHIDO', side: 'blue' },
    ]);
    const s = reduce(played, { type: 'RESET_SCORES' }, T0);
    expect(s.phase).toBe('ready');
    expect(s.white.name).toBe('Ivanov');
    expect(s.white.yuko).toBe(0);
    expect(s.blue.shido).toBe(0);
    expect(s.goldenScore).toBe(false);
  });

  it('new match clears the names and returns to the form', () => {
    const s = reduce(setup(180_000), { type: 'NEW_MATCH' }, T0);
    expect(s.phase).toBe('setup');
    expect(s.white.name).toBe('');
    expect(s.durationMs).toBe(180_000);
  });
});

describe('purity', () => {
  it('returns the identical object when nothing changes', () => {
    const s = setup();
    expect(reduce(s, { type: 'MATE' }, T0)).toBe(s);
  });
});
