import { DEFAULT_DURATION_MS, MAX_WAZAARI } from './rules';

export type Side = 'white' | 'blue';
export type ScoreType = 'yuko' | 'wazaari' | 'ippon';
export type OsaekomiLevel = 'none' | ScoreType;
export type Phase = 'setup' | 'ready' | 'fighting' | 'paused' | 'finished';

export type WinReason =
  | 'ippon'
  | 'waza-ari-awasete-ippon'
  | 'waza-ari'
  | 'yuko'
  | 'hansoku-make';

export interface SideState {
  name: string;
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
}

export function createSideState(name = ''): SideState {
  return { name, ippon: false, wazaari: 0, yuko: 0, shido: 0 };
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
  };
}

/** Two waza-ari are an ippon, but the flag itself records only a direct ippon. */
export function hasIppon(s: SideState): boolean {
  return s.ippon || s.wazaari >= MAX_WAZAARI;
}

export function opposite(side: Side): Side {
  return side === 'white' ? 'blue' : 'white';
}
