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
 * Deliberately partial, and read through themeFor rather than indexed
 * directly. A board is artwork compiled into this bundle, but a theme id is
 * data that outlives the build that wrote it: it arrives from localStorage
 * or across the channel from the other tab, which may be running an older or
 * newer bundle. A build that meets an id it does not know must still put a
 * board in front of the hall.
 */
export const THEMES: Partial<Record<ThemeId, ThemeEntry>> = {
  modern: MODERN,
  ijf: { label: 'IJF', Board: IjfBoard },
};

export function themeFor(id: ThemeId): ThemeEntry {
  return THEMES[id] ?? MODERN;
}
