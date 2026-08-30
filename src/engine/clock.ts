import type { Clock, MatchState, Osaekomi, OsaekomiLevel } from './matchState';
import { OSAEKOMI_IPPON_MS, OSAEKOMI_WAZAARI_MS, OSAEKOMI_YUKO_MS } from './rules';

export function elapsed(clock: Clock, now: number): number {
  if (!clock.running || clock.startedAt === null) return clock.elapsedMs;
  return clock.elapsedMs + (now - clock.startedAt);
}

/** Regulation time left, clamped at zero. Meaningless during golden score. */
export function remaining(state: MatchState, now: number): number {
  return Math.max(0, state.durationMs - elapsed(state.clock, now));
}

export function osaekomiElapsed(o: Osaekomi, now: number): number {
  if (o.side === null) return 0;
  if (o.startedAt === null) return o.elapsedMs;
  return o.elapsedMs + (now - o.startedAt);
}

export function osaekomiLevel(ms: number): OsaekomiLevel {
  if (ms >= OSAEKOMI_IPPON_MS) return 'ippon';
  if (ms >= OSAEKOMI_WAZAARI_MS) return 'wazaari';
  if (ms >= OSAEKOMI_YUKO_MS) return 'yuko';
  return 'none';
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function mmss(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${pad2(m)}:${pad2(s)}`;
}

/** Countdowns round up, so 00:00 appears only when the time is truly gone. */
export function formatCountdown(ms: number): string {
  return mmss(Math.ceil(Math.max(0, ms) / 1000));
}

export function formatCountUp(ms: number): string {
  return mmss(Math.floor(Math.max(0, ms) / 1000));
}

export function formatOsaekomi(ms: number): string {
  return pad2(Math.floor(Math.max(0, ms) / 1000));
}
