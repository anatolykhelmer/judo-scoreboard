import type { Persisted } from '../sync/channel';
import { isContestToken } from './parseLink';
import type { ServerLink } from './parseLink';

/**
 * One id per browser, not per contest. The server reads it as "this table",
 * which is what lets it hand the next bout to the same mat — so a second
 * id, minted by a Strict Mode remount or by the next bout, would look like
 * a second table and lose the queue.
 */
export const PANEL_ID_KEY = 'judo-scoreboard:panel-id';

/**
 * Which contest this browser is currently holding, and whose server it
 * came from. Deliberately a key of its own rather than a field inside the
 * persisted match: PERSIST_VERSION would then have to move, and a deploy
 * mid-tournament would throw away an in-progress contest to add a field
 * the engine never reads.
 */
export const SESSION_KEY = 'judo-scoreboard:server';

export interface ServerSession {
  api: string;
  token: string;
  /**
   * Set the moment a contest finishes, cleared only when the server has
   * taken its report. It is the one piece of this that has to outlive the
   * page: a failed POST leaves a contest that was fought and never filed,
   * and the panel has to know that on the way back up. See resultOwed.
   */
  owed?: boolean;
}

/**
 * Read before write, always. React's Strict Mode mounts, cleans up and
 * remounts every effect once in development; a mint-then-store that
 * skipped the read would answer with a fresh uuid on the remount and the
 * claim and the result would arrive from two different tables.
 */
export function getOrCreatePanelId(storage: Storage, randomUUID?: () => string): string {
  const existing = storage.getItem(PANEL_ID_KEY);
  if (typeof existing === 'string' && existing !== '') return existing;
  const id = (randomUUID ?? (() => crypto.randomUUID()))();
  storage.setItem(PANEL_ID_KEY, id);
  return id;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Null for anything this version did not write — same contract as loadPersisted. */
export function loadSession(storage: Storage | null): ServerSession | null {
  const raw = storage?.getItem(SESSION_KEY);
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) return null;
  const { api, token, owed } = parsed;
  if (typeof api !== 'string' || api === '') return null;
  if (typeof token !== 'string' || !isContestToken(token)) return null;
  // Exactly true, or absent. Anything else is a payload this version did
  // not write, and "a result is owed" is not a thing to guess at.
  return owed === true ? { api, token, owed: true } : { api, token };
}

export function saveSession(storage: Storage | null, session: ServerSession): void {
  storage?.setItem(SESSION_KEY, JSON.stringify(session));
}

/**
 * A contest was fought, its report never reached the server, and the page
 * has since reloaded.
 *
 * This is the case the in-memory guards cannot cover. The panel posts on
 * the *transition* into `finished` — it has to, or resuming a contest that
 * already ended would file it a second time — but a transition is a fact
 * about one page load. Reload after a failed POST and there is no
 * transition left to notice: the contest comes back already finished, the
 * panel offers to resume it, and nothing ever says a report is outstanding.
 *
 * What made that dangerous rather than merely untidy is what the operator
 * would do next. A finished contest with no prompt invites New match; the
 * ticket is still live, so the *next* bout fought on this table would be
 * posted under it — and the server, keeping the first report it is given,
 * would make the wrong one official.
 *
 * So the obligation is written down next to the ticket, and survives the
 * reload that the ref could not.
 */
export function resultOwed(
  saved: Persisted | null,
  session: ServerSession | null,
  currentToken: string,
): boolean {
  if (session === null || session.owed !== true) return false;
  if (session.token !== currentToken) return false;
  return saved !== null && saved.state.phase === 'finished';
}

export function clearSession(storage: Storage | null): void {
  storage?.removeItem(SESSION_KEY);
}

/**
 * Which contest the panel is actually on. The hash is only the *entry*
 * ticket: by the third bout of the day the address bar still says the
 * first one, and the tokens that followed arrived in result responses and
 * were never written back into the URL. So a stored token for this same
 * `api` wins — otherwise a reload at 11am would drag the table back to the
 * contest it finished before breakfast and try to report it again.
 *
 * Tied to the api it was stored against: a link to a different club server
 * is a different queue, and its hash is the entry ticket again.
 */
export function resolveToken(
  link: Extract<ServerLink, { kind: 'ok' }>,
  session: ServerSession | null,
): string {
  if (session && session.api === link.api) return session.token;
  return link.token;
}

/**
 * Whether the saved contest is *this ticket's* contest, and so may be
 * offered to the operator as a resume.
 *
 * The `session === null` case is the one worth spelling out: that is the
 * first time this browser has claimed anything from this server, so
 * whatever is in storage belongs to some standalone bout run earlier on
 * this laptop. Resuming it here would bind a contest nobody at this
 * tournament fought to a live ticket, and report it as that ticket's
 * result when it finished.
 */
export function serverResumable(
  saved: Persisted | null,
  link: ServerLink,
  session: ServerSession | null,
  currentToken: string,
): boolean {
  if (link.kind !== 'ok') return false;
  if (saved === null || saved.state.phase === 'setup') return false;
  if (session === null) return false;
  return session.api === link.api && session.token === currentToken;
}
