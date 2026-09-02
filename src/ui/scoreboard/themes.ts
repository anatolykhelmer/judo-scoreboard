import type { ReactNode } from 'react';
import type { MatchState, ThemeId } from '../../engine/matchState';
import { IjfBoard } from './ijf/IjfBoard';
import { ModernBoard } from './modern/ModernBoard';

/** Every board takes the whole contest and the current time. Nothing else. */
export interface BoardProps {
  state: MatchState;
  now: number;
}

export interface ThemeEntry {
  /** What the operator sees in the setup form. */
  label: string;
  Board: (props: BoardProps) => ReactNode;
}

const MODERN: ThemeEntry = { label: 'Modern', Board: ModernBoard };

/*
 * `satisfies Record<ThemeId, ThemeEntry>` makes THEMES exhaustive at compile
 * time: adding an id to ThemeId without adding a board here is a type error,
 * not a hall silently showing the wrong board.
 *
 * Still read through themeFor rather than indexed directly, and themeFor
 * still casts to Partial before it falls back to MODERN. The map is
 * exhaustive at compile time, but a theme id is data that outlives the build
 * that wrote it: it arrives from localStorage or across the channel from the
 * other tab, which may be running an older or newer bundle than this one, so
 * the id itself is not exhaustive the way the map is. A build that meets an
 * id it does not know must still put a board in front of the hall.
 */
export const THEMES = {
  modern: MODERN,
  ijf: { label: 'IJF', Board: IjfBoard },
} satisfies Record<ThemeId, ThemeEntry>;

export function themeFor(id: ThemeId): ThemeEntry {
  return (THEMES as Partial<Record<ThemeId, ThemeEntry>>)[id] ?? MODERN;
}
