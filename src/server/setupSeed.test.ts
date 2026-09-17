import { describe, expect, it } from 'vitest';
import { setupSeedFromContest } from './setupSeed';

describe('setupSeedFromContest', () => {
  it('splits IJF names and keeps duration in minutes', () => {
    expect(setupSeedFromContest({
      white: { name: 'KOGA Toshihiko', country: 'JPN' },
      blue: { name: 'DOUILLET David', country: 'FRA' },
      category: '-71 kg',
      durationMs: 240000,
      round: 'FINAL',
    })).toEqual({
      whiteSurname: 'KOGA',
      whiteGiven: 'Toshihiko',
      blueSurname: 'DOUILLET',
      blueGiven: 'David',
      category: '-71 kg',
      minutes: '4',
      round: 'FINAL',
      whiteCountry: 'JPN',
      blueCountry: 'FRA',
    });
  });

  it('falls back to IJF for an unknown country code', () => {
    expect(setupSeedFromContest({
      white: { name: 'ABE', country: 'XXX' },
      blue: { name: 'KIM Se Heon', country: 'KOR' },
      category: '',
      durationMs: 180000,
      round: '',
    }).whiteCountry).toBe('IJF');
  });

  it('keeps a half-minute contest typeable in the minutes field', () => {
    expect(setupSeedFromContest({
      white: { name: 'ABE', country: 'JPN' },
      blue: { name: 'KIM Se Heon', country: 'KOR' },
      category: '',
      durationMs: 90000,
      round: '',
    }).minutes).toBe('1.5');
  });
});
