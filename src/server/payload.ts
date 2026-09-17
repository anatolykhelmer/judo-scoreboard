import { DEFAULT_COUNTRY } from '../data/countries';
import type { MatchState, SideState } from '../engine/matchState';
import { isContestToken } from './parseLink';

export interface ContestAthlete {
  name: string;
  country: string;
}

/** The contest as the server describes it — spec section 6. */
export interface ContestFields {
  white: ContestAthlete;
  blue: ContestAthlete;
  category: string;
  durationMs: number;
  round: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function optionalString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

/**
 * A name is the one field the panel cannot invent. Everything else has a
 * value that costs the operator nothing — the neutral country, an empty
 * category — but a blank corner would put an unnamed athlete on the hall
 * board under a ticket that will later be reported as a real result.
 */
function athlete(value: unknown): ContestAthlete | null {
  if (!isRecord(value)) return null;
  if (typeof value.name !== 'string' || value.name.trim() === '') return null;
  return { name: value.name.trim(), country: optionalString(value.country, DEFAULT_COUNTRY) };
}

/**
 * Returns null for anything that is not a contest this version understands.
 * A payload that fails is a *failed claim*, not a blank contest: the panel
 * would otherwise open an empty form bound to a live ticket, and whatever
 * the operator typed into it would be reported as that contest's result.
 *
 * Unknown keys are ignored rather than refused — that is what lets the
 * server grow — and that deliberately includes any URL the body carries.
 * The panel builds every path it calls from the `api` the operator
 * confirmed; a `resultUrl` in the JSON is a redirect nobody agreed to.
 */
export function parseContestPayload(body: unknown): ContestFields | null {
  if (!isRecord(body) || body.version !== 1) return null;
  const contest = body.contest;
  if (!isRecord(contest)) return null;

  const white = athlete(contest.white);
  const blue = athlete(contest.blue);
  if (!white || !blue) return null;

  const durationMs = contest.durationMs;
  if (typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs <= 0) {
    return null;
  }

  return {
    white,
    blue,
    category: optionalString(contest.category, ''),
    durationMs,
    round: optionalString(contest.round, ''),
  };
}

/**
 * Three answers, so three return values rather than two:
 *
 * - a string — the ticket for this table's next bout;
 * - `null` — the server says this table is done for the day;
 * - `undefined` — the body did not answer, which is a *failed* read and
 *   must leave the operator on a Retry, not on "no further contest".
 *
 * `nextToken` is a token and never a URL. A `nextUrl`, like any other
 * unknown key, is ignored: the host was confirmed once and does not get
 * to move the panel afterwards.
 */
export function parseNextToken(body: unknown): string | null | undefined {
  if (!isRecord(body)) return undefined;
  const next = body.nextToken;
  if (next === null) return null;
  if (typeof next === 'string' && isContestToken(next)) return next;
  return undefined;
}

function sideReport(s: SideState) {
  return {
    name: s.name,
    country: s.country,
    ippon: s.ippon,
    wazaari: s.wazaari,
    yuko: s.yuko,
    shido: s.shido,
  };
}

/**
 * The table's report — spec section 7. Sent once, when the contest is over.
 *
 * `elapsedMs` is read off the stopped clock rather than measured against
 * the wall: it is the contest time the athletes actually fought, with the
 * mate periods already excluded by the engine.
 *
 * Callers only reach this with `state.winner` non-null; the panel POSTs on
 * `phase === 'finished'`, and the engine sets both in the same step.
 */
export function buildResultBody(panelId: string, state: MatchState): object {
  return {
    version: 1,
    panelId,
    result: {
      winner: state.winner,
      white: sideReport(state.white),
      blue: sideReport(state.blue),
      goldenScore: state.goldenScore,
      elapsedMs: state.clock.elapsedMs,
      durationMs: state.durationMs,
      category: state.category,
      round: state.round,
    },
  };
}
