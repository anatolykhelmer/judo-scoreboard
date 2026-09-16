import { describe, expect, it } from 'vitest';
import { flagUrl, isRoundel } from './flagUrl';

describe('flagUrl', () => {
  it('points a country at its own file, named by the IJF code', () => {
    expect(flagUrl('GEO')).toContain('flags/GEO.svg');
  });

  it('respects the deployment base path', () => {
    expect(flagUrl('GEO').startsWith(import.meta.env.BASE_URL)).toBe(true);
  });

  it('gives the three IJF identities the federation roundel instead', () => {
    for (const code of ['IJF', 'IRT', 'AIN']) {
      expect(flagUrl(code), code).toBe(flagUrl('IJF'));
    }
  });

  // A board in a hall must not show a broken image because a saved contest
  // carried a code this build no longer knows.
  it('falls back to the roundel for an unknown code', () => {
    expect(flagUrl('ZZZ')).toBe(flagUrl('IJF'));
  });
});

describe('isRoundel', () => {
  it('is false for a country, which has a flag of its own', () => {
    expect(isRoundel('GEO')).toBe(false);
  });

  // The board draws these as a circle rather than in the flag box, so the
  // predicate has to agree with flagUrl about which codes they are.
  it('is true for the three IJF identities and for an unknown code', () => {
    for (const code of ['IJF', 'IRT', 'AIN', 'ZZZ']) {
      expect(isRoundel(code), code).toBe(true);
      expect(flagUrl(code), code).toBe(flagUrl('IJF'));
    }
  });
});
