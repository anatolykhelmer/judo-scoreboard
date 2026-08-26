import { describe, expect, it } from 'vitest';
import { reduce } from './matchEngine';
import type { Action } from './matchEngine';
import { createInitialState, hasIppon } from './matchState';
import type { MatchState } from './matchState';

const T0 = 1_000_000;

function fighting(durationMs = 120_000): MatchState {
  const ready = reduce(
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
  return reduce(ready, { type: 'HAJIME' }, T0);
}

function holding(side: 'white' | 'blue' = 'white', durationMs = 120_000): MatchState {
  return reduce(fighting(durationMs), { type: 'OSAEKOMI_START', side }, T0);
}

function tickAt(state: MatchState, offsetMs: number): MatchState {
  return reduce(state, { type: 'TICK' }, T0 + offsetMs);
}

describe('OSAEKOMI_START', () => {
  it('only starts while the contest is running', () => {
    const ready = reduce(
      createInitialState(),
      {
        type: 'SETUP_MATCH', white: 'A', blue: 'B', category: '',
        durationMs: 120_000, swapSides: false, logoDataUrl: null,
      },
      T0,
    );
    expect(reduce(ready, { type: 'OSAEKOMI_START', side: 'white' }, T0)).toBe(ready);
  });

  it('ignores a second hold while one is already running', () => {
    const held = holding('white');
    expect(reduce(held, { type: 'OSAEKOMI_START', side: 'blue' }, T0 + 1000)).toBe(held);
  });
});

describe('osaekomi thresholds', () => {
  it('awards nothing before five seconds', () => {
    const s = tickAt(holding(), 4_999);
    expect(s.white.yuko).toBe(0);
    expect(s.osaekomi.awarded).toBe('none');
  });

  it('awards a yuko at five seconds', () => {
    const s = tickAt(holding(), 5_000);
    expect(s.white.yuko).toBe(1);
    expect(s.osaekomi.awarded).toBe('yuko');
    expect(s.phase).toBe('fighting');
  });

  it('still awards the yuko when a tick is missed (4.6s then 6.2s)', () => {
    const s = tickAt(tickAt(holding(), 4_600), 6_200);
    expect(s.white.yuko).toBe(1);
    expect(s.osaekomi.awarded).toBe('yuko');
  });

  it('jumps straight to waza-ari when the tick skips the yuko window (4.5s then 10.2s)', () => {
    const s = tickAt(tickAt(holding(), 4_500), 10_200);
    expect(s.white.yuko).toBe(0);
    expect(s.white.wazaari).toBe(1);
    expect(s.osaekomi.awarded).toBe('wazaari');
  });

  it('replaces its own yuko with a waza-ari rather than keeping both', () => {
    const s = tickAt(tickAt(holding(), 6_000), 11_000);
    expect(s.white.yuko).toBe(0);
    expect(s.white.wazaari).toBe(1);
  });

  it('ends the contest with ippon at twenty seconds and releases the hold', () => {
    const s = tickAt(tickAt(tickAt(holding(), 6_000), 11_000), 20_000);
    expect(s.phase).toBe('finished');
    expect(hasIppon(s.white)).toBe(true);
    expect(s.white.wazaari).toBe(0);
    expect(s.osaekomi.side).toBeNull();
    expect(s.winner?.reason).toBe('ippon');
  });

  it('turns an existing waza-ari into awasete-ippon at ten seconds', () => {
    const withOne = reduce(fighting(), { type: 'SCORE', side: 'white', scoreType: 'wazaari' }, T0);
    const held = reduce(withOne, { type: 'OSAEKOMI_START', side: 'white' }, T0);
    const s = tickAt(held, 10_000);
    expect(s.phase).toBe('finished');
    expect(s.white.wazaari).toBe(2);
    expect(s.winner?.reason).toBe('waza-ari-awasete-ippon');
  });
});

describe('osaekomi in golden score', () => {
  function goldenScoreHold(): MatchState {
    const expired = reduce(fighting(), { type: 'MATE' }, T0 + 120_000);
    const started = reduce(expired, { type: 'HAJIME' }, T0);
    return reduce(started, { type: 'OSAEKOMI_START', side: 'blue' }, T0);
  }

  it('ends the contest at five seconds and never reaches waza-ari', () => {
    const s = tickAt(goldenScoreHold(), 5_000);
    expect(s.phase).toBe('finished');
    expect(s.blue.yuko).toBe(1);
    expect(s.blue.wazaari).toBe(0);
    expect(s.winner).toEqual({
      side: 'blue',
      reason: 'yuko',
      causedBy: { side: 'blue', type: 'yuko' },
    });
    expect(s.osaekomi.side).toBeNull();
  });

  it('stays finished if the clock keeps ticking', () => {
    const finished = tickAt(goldenScoreHold(), 5_000);
    expect(tickAt(finished, 25_000)).toBe(finished);
  });
});

describe('time expiry with a hold in progress', () => {
  it('stops the clock but defers the decision', () => {
    const held = reduce(fighting(10_000), { type: 'OSAEKOMI_START', side: 'white' }, T0 + 8_000);
    const s = tickAt(held, 10_500);
    expect(s.clock.running).toBe(false);
    expect(s.phase).toBe('fighting');
    expect(s.osaekomi.side).toBe('white');
    expect(s.winner).toBeNull();
  });

  it('decides the contest once toketa is called', () => {
    const held = reduce(fighting(10_000), { type: 'OSAEKOMI_START', side: 'white' }, T0 + 8_000);
    const expired = tickAt(held, 13_500);
    expect(expired.white.yuko).toBe(1);

    const s = reduce(expired, { type: 'TOKETA' }, T0 + 13_600);
    expect(s.phase).toBe('finished');
    expect(s.winner).toEqual({ side: 'white', reason: 'yuko', causedBy: null });
  });

  it('goes to golden score if the hold earned nothing decisive', () => {
    const held = reduce(fighting(10_000), { type: 'OSAEKOMI_START', side: 'white' }, T0 + 8_000);
    const expired = tickAt(held, 10_500);
    const s = reduce(expired, { type: 'TOKETA' }, T0 + 11_000);
    expect(s.goldenScore).toBe(true);
    expect(s.phase).toBe('paused');
  });
});

describe('tick purity', () => {
  it('returns the identical object while nothing crosses a threshold', () => {
    const held = holding();
    const s = tickAt(held, 1_000);
    expect(s).toBe(held);
  });

  it('is a no-op outside a running contest', () => {
    const ready = reduce(
      createInitialState(),
      {
        type: 'SETUP_MATCH', white: 'A', blue: 'B', category: '',
        durationMs: 120_000, swapSides: false, logoDataUrl: null,
      },
      T0,
    );
    const noop: Action = { type: 'TICK' };
    expect(reduce(ready, noop, T0 + 999_999)).toBe(ready);
  });
});
