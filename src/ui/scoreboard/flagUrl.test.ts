import { describe, expect, it } from 'vitest';
import { flagUrl } from './flagUrl';

describe('flagUrl', () => {
  it('points a country at its own file, named by the IJF code', () => {
    expect(flagUrl('GEO')).toContain('flags/GEO.svg');
  });

  it('respects the deployment base path', () => {
    expect(flagUrl('GEO').startsWith(import.meta.env.BASE_URL)).toBe(true);
  });

  it('gives the three IJF identities the federation roundel instead', () => {
    for (const code of ['IJF', 'IRT', 'AIN']) {
      expect(flagUrl(code), code).not.toContain('/flags/');
    }
  });

  // A board in a hall must not show a broken image because a saved contest
  // carried a code this build no longer knows.
  it('falls back to the roundel for an unknown code', () => {
    expect(flagUrl('ZZZ')).toBe(flagUrl('IJF'));
  });
});
