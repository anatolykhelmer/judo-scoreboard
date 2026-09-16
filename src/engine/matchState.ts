import { DEFAULT_COUNTRY } from '../data/countries';
import { DEFAULT_DURATION_MS, MAX_WAZAARI } from './rules';

export type Side = 'white' | 'blue';
export type ScoreType = 'yuko' | 'wazaari' | 'ippon';
export type OsaekomiLevel = 'none' | ScoreType;
export type Phase = 'setup' | 'ready' | 'fighting' | 'paused' | 'finished';

/**
 * Which board the hall sees. It rides in the match state rather than in the
 * scoreboard tab's own settings so the operator picks it once, on the setup
 * form, and never has to touch the second tab — the same reasoning as
 * logoDataUrl. Declared here rather than in ui/ because it crosses the wire:
 * the engine must not import from the UI layer.
 */
export type ThemeId = 'modern' | 'ijf';

/**
 * The board a fresh contest, a payload without a theme and an id this build
 * does not know all resolve to. The IJF board is what the halls this runs in
 * expect to see; modern is the one that shipped first and stays available.
 */
export const DEFAULT_THEME: ThemeId = 'ijf';

export type WinReason =
  | 'ippon'
  | 'waza-ari-awasete-ippon'
  | 'waza-ari'
  | 'yuko'
  | 'hansoku-make';

export interface SideState {
  name: string;
  /** Three-letter IJF/IOC code — what the board prints. See src/data/countries.ts. */
  country: string;
  /** True only when ippon was scored directly. Use hasIppon() to display. */
  ippon: boolean;
  wazaari: number;
  yuko: number;
  shido: number;
}

export interface Clock {
  running: boolean;
  startedAt: number | null;
  elapsedMs: number;
}

export interface Osaekomi {
  side: Side | null;
  startedAt: number | null;
  elapsedMs: number;
  awarded: OsaekomiLevel;
}

export interface Winner {
  side: Side;
  reason: WinReason;
  /** null when the contest was decided by time rather than by one action. */
  causedBy: { side: Side; type: ScoreType | 'shido' } | null;
}

export interface MatchState {
  category: string;
  durationMs: number;
  white: SideState;
  blue: SideState;
  clock: Clock;
  osaekomi: Osaekomi;
  goldenScore: boolean;
  phase: Phase;
  winner: Winner | null;
  /**
   * True when the control panel puts white on the right — which is how the
   * corners face an operator sitting at the table, so it is the default.
   *
   * This orders the operator's panel and nothing else. The hall's board is
   * built white-on-the-left and stays that way; mirroring it would move the
   * corners under an audience that has already learnt to read them.
   */
  swapSides: boolean;
  logoDataUrl: string | null;
  theme: ThemeId;
  /** Tournament phase, e.g. 'ROUND OF 32'. Empty when the operator left it blank. */
  round: string;
}

export function createSideState(name = '', country = DEFAULT_COUNTRY): SideState {
  return { name, country, ippon: false, wazaari: 0, yuko: 0, shido: 0 };
}

export function createInitialState(): MatchState {
  return {
    category: '',
    durationMs: DEFAULT_DURATION_MS,
    white: createSideState(),
    blue: createSideState(),
    clock: { running: false, startedAt: null, elapsedMs: 0 },
    osaekomi: { side: null, startedAt: null, elapsedMs: 0, awarded: 'none' },
    goldenScore: false,
    phase: 'setup',
    winner: null,
    swapSides: true,
    logoDataUrl: null,
    theme: DEFAULT_THEME,
    round: '',
  };
}

/** Two waza-ari are an ippon, but the flag itself records only a direct ippon. */
export function hasIppon(s: SideState): boolean {
  return s.ippon || s.wazaari >= MAX_WAZAARI;
}

export function opposite(side: Side): Side {
  return side === 'white' ? 'blue' : 'white';
}
