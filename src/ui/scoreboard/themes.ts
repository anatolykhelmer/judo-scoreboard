import type { ReactNode } from 'react';
import { DEFAULT_THEME } from '../../engine/matchState';
import type { MatchState, ThemeId } from '../../engine/matchState';
import { IjfBoard } from './ijf/IjfBoard';
import { ModernBoard } from './modern/ModernBoard';
import { TvBoard } from './tv/TvBoard';

/** Every board takes the whole contest and the current time. Nothing else. */
export interface BoardProps {
  state: MatchState;
  now: number;
}

export interface ThemeEntry {
  /** What the operator sees in the setup form. */
  label: string;
  Board: (props: BoardProps) => ReactNode;
  /**
   * Registered but not offered: the setup form leaves the chip out. The
   * board itself stays, so a contest saved or synced on it still renders.
   */
  hidden?: true;
}

const MODERN: ThemeEntry = { label: 'Modern', Board: ModernBoard, hidden: true };
const IJF: ThemeEntry = { label: 'IJF', Board: IjfBoard };
const TV: ThemeEntry = { label: 'TV', Board: TvBoard };

/*
 * `satisfies Record<ThemeId, ThemeEntry>` makes THEMES exhaustive at compile
 * time: adding an id to ThemeId without adding a board here is a type error,
 * not a hall silently showing the wrong board.
 *
 * Still read through themeFor rather than indexed directly, and themeFor
 * still casts to Partial before it falls back to the default board. The map is
 * exhaustive at compile time, but a theme id is data that outlives the build
 * that wrote it: it arrives from localStorage or across the channel from the
 * other tab, which may be running an older or newer bundle than this one, so
 * the id itself is not exhaustive the way the map is. A build that meets an
 * id it does not know must still put a board in front of the hall.
 *
 * The default board comes first: the setup form lists the chips in this
 * order, and the one a fresh contest starts on should be the one at the left.
 */
export const THEMES = {
  tv: TV,
  ijf: IJF,
  modern: MODERN,
} satisfies Record<ThemeId, ThemeEntry>;

/** The chips the setup form shows, in order: every registered theme not marked hidden. */
export function visibleThemes(): ThemeId[] {
  return (Object.keys(THEMES) as ThemeId[]).filter((id) => !THEMES[id].hidden);
}

/**
 * What the setup form starts on. NEW_MATCH carries the theme forward, so a
 * contest saved on a hidden board would otherwise open the form with no chip
 * checked — and Start would send that board to the hall again. A hidden or
 * unknown id snaps to the default; an offered one is kept.
 */
export function offeredTheme(id: ThemeId): ThemeId {
  return visibleThemes().includes(id) ? id : DEFAULT_THEME;
}

export function themeFor(id: ThemeId): ThemeEntry {
  return (THEMES as Partial<Record<ThemeId, ThemeEntry>>)[id] ?? THEMES[DEFAULT_THEME];
}
