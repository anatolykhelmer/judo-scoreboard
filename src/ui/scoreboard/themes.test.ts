import { describe, expect, it } from 'vitest';
import type { ThemeId } from '../../engine/matchState';
import { THEMES, themeFor, visibleThemes } from './themes';

describe('themeFor', () => {
  it('resolves a registered theme', () => {
    expect(themeFor('modern').label).toBe('Modern');
  });

  it('resolves the TV theme', () => {
    expect(themeFor('tv').label).toBe('TV');
  });

  // The id comes from persisted state or from the other tab, so it can name
  // a theme this bundle has never heard of. A hall gets a board either way.
  it('falls back to the default board for an id this build does not know', () => {
    expect(themeFor('bogus' as ThemeId)).toBe(themeFor('tv'));
  });

  // The modern board stays registered — a contest saved on it still gets
  // its board — but the setup form does not offer it for now. The default
  // comes first, since that is the chip a fresh contest starts on.
  it('offers the TV and IJF boards, in that order, and hides modern', () => {
    expect(visibleThemes()).toEqual(['tv', 'ijf']);
    expect(THEMES.modern.hidden).toBe(true);
  });
});
