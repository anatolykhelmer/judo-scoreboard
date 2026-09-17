import type { MatchState } from '../engine/matchState';
import { buildResultBody, parseContestPayload, parseNextToken } from './payload';
import type { ContestFields } from './payload';

export type ClaimOk = { ok: true; contest: ContestFields };
export type ClaimErr = {
  ok: false;
  error: 'pin_required' | 'pin_invalid' | 'claimed' | 'not_found' | 'expired' | 'network' | 'invalid_payload';
};

export type ResultOk = { ok: true; nextToken: string | null };
export type ResultErr = {
  ok: false;
  error: 'claimed' | 'not_found' | 'expired' | 'forbidden' | 'network' | 'invalid_next';
};

/** `'network'` covers both a refused connection and a 5xx: nothing to read either way. */
type Answer = { status: number; json: unknown } | { status: 'network' };

/**
 * `credentials: 'omit'` is the point of writing this out rather than
 * calling `fetch` twice inline. The panel has no login and wants none —
 * nothing it sends should carry a cookie the browser happens to hold for
 * that host, and the server's CORS allowlist is simpler for it.
 *
 * `referrerPolicy` repeats what index.html already declares for the
 * document. It is repeated because the thing being protected is here: the
 * panel URL carries the club API in its query and the contest ticket in
 * its fragment, and a request that leaked it would leak it from this
 * function. A meta tag three directories away is not where that guarantee
 * should live, and it is not in force for a caller that is not the
 * document — an embedding, or a test harness.
 *
 * A body that is not JSON is not an error here. A 404 or a 410 from a
 * proxy arrives as HTML, and the status is the whole answer anyway.
 */
async function postJson(fetchFn: typeof fetch, url: string, body: unknown): Promise<Answer> {
  try {
    const res = await fetchFn(url, {
      method: 'POST',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json: unknown = await res.json().catch(() => null);
    return { status: res.status, json };
  } catch {
    return { status: 'network' };
  }
}

function errorCode(json: unknown): string | null {
  if (typeof json !== 'object' || json === null) return null;
  const error = (json as Record<string, unknown>).error;
  return typeof error === 'string' ? error : null;
}

/**
 * Takes the contest for this table. Sent again with a PIN when the server
 * asks for one, and again on every reload — a repeat claim from the same
 * panelId is a 200, which is what lets a reloaded panel pick its own
 * contest back up.
 */
export async function claimContest(opts: {
  api: string;
  token: string;
  panelId: string;
  pin?: string;
  fetch?: typeof fetch;
}): Promise<ClaimOk | ClaimErr> {
  const body: Record<string, unknown> = { panelId: opts.panelId };
  // Absent, not empty: an empty string is the operator having typed
  // nothing yet, and the server would read it as a wrong PIN.
  if (opts.pin !== undefined && opts.pin !== '') body.pin = opts.pin;

  const answer = await postJson(
    opts.fetch ?? fetch,
    `${opts.api}/v1/contests/${opts.token}/claim`,
    body,
  );
  if (answer.status === 'network') return { ok: false, error: 'network' };

  switch (answer.status) {
    case 200: {
      const contest = parseContestPayload(answer.json);
      return contest ? { ok: true, contest } : { ok: false, error: 'invalid_payload' };
    }
    // A bare 403 with no code still means "you may not have this yet", and
    // the PIN field is the only thing the operator can do about it.
    case 403:
      return { ok: false, error: errorCode(answer.json) === 'pin_invalid' ? 'pin_invalid' : 'pin_required' };
    case 404:
      return { ok: false, error: 'not_found' };
    case 409:
      return { ok: false, error: 'claimed' };
    case 410:
      return { ok: false, error: 'expired' };
    default:
      return { ok: false, error: 'network' };
  }
}

/**
 * The table's report, sent once when the contest ends. Safe to repeat: the
 * server keeps the first report and answers a retry with the same 200, so
 * a lost `nextToken` can be read again without inventing a second result.
 *
 * 403 is `forbidden` rather than a PIN prompt — ownership here is the
 * claim, and there is no PIN on this endpoint to offer.
 */
export async function postResult(opts: {
  api: string;
  token: string;
  panelId: string;
  state: MatchState;
  fetch?: typeof fetch;
}): Promise<ResultOk | ResultErr> {
  const answer = await postJson(
    opts.fetch ?? fetch,
    `${opts.api}/v1/contests/${opts.token}/result`,
    buildResultBody(opts.panelId, opts.state),
  );
  if (answer.status === 'network') return { ok: false, error: 'network' };

  switch (answer.status) {
    case 200: {
      const next = parseNextToken(answer.json);
      // undefined is "the body did not answer", which must not read as
      // "this table is done" — see parseNextToken.
      return next === undefined ? { ok: false, error: 'invalid_next' } : { ok: true, nextToken: next };
    }
    case 403:
      return { ok: false, error: 'forbidden' };
    case 404:
      return { ok: false, error: 'not_found' };
    case 409:
      return { ok: false, error: 'claimed' };
    case 410:
      return { ok: false, error: 'expired' };
    default:
      return { ok: false, error: 'network' };
  }
}
