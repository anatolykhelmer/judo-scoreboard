import { describe, expect, it } from 'vitest';
import type { ThemeId } from '../../engine/matchState';
import { themeFor } from './themes';

describe('themeFor', () => {
  it('resolves a registered theme', () => {
    expect(themeFor('modern').label).toBe('Modern');
  });

  // The id comes from persisted state or from the other tab, so it can name
  // a theme this bundle has never heard of. A hall gets a board either way.
  it('falls back to the default board for an id this build does not know', () => {
    expect(themeFor('bogus' as ThemeId)).toBe(themeFor('ijf'));
  });
});
