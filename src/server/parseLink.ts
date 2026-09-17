/**
 * The opt-in link. Everything in `src/server/` is dead code until this
 * module says the URL carries a usable `api`, so this is the one gate
 * between a standalone panel and a panel that talks to a club server.
 *
 * `api` rides in the query and the contest token rides in the hash,
 * because the hash is never sent to the panel's own host: the token is a
 * capability — knowing it is the right to claim that contest — and putting
 * it in the query would write it into GitHub Pages' access logs.
 */
export type ServerLink =
  /** No `api` at all. The panel is standalone and makes no request. */
  | { kind: 'absent' }
  /** `api` is usable but there is no contest token to claim. */
  | { kind: 'incomplete' }
  /** `api` is present and unusable. Refused up front rather than fetched. */
  | { kind: 'invalid' }
  | { kind: 'ok'; api: string; host: string; token: string };

/**
 * The token is opaque to the panel: it is not parsed, only pasted into a
 * path this module's callers build. So the only rule is that it cannot
 * change the shape of that path — no separator may appear inside it.
 */
export function isContestToken(value: string): boolean {
  return value.length > 0 && !/[/?#]/.test(value);
}

function tokenFromHash(hash: string): string | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  const token = params.get('c');
  if (token === null || !isContestToken(token)) return null;
  return token;
}

/**
 * Takes the two halves of a `Location` rather than `Location` itself, so
 * the whole of this can be tested without a browser.
 *
 * A `c` in the *query* is ignored on purpose (see the `absent` case): the
 * token belongs in the hash, and honouring a query copy would quietly
 * undo the reason it is in the hash at all.
 */
export function parseServerLink(loc: { search: string; hash: string }): ServerLink {
  const search = loc.search.startsWith('?') ? loc.search.slice(1) : loc.search;
  const apiParam = new URLSearchParams(search).get('api');
  if (apiParam === null || apiParam === '') return { kind: 'absent' };

  const token = tokenFromHash(loc.hash);
  let url: URL;
  try {
    url = new URL(apiParam);
  } catch {
    return { kind: 'invalid' };
  }

  // TLS is the only wire defence there is — a panel served from GitHub
  // Pages has no secret it could add. `http:` survives only for localhost,
  // where a developer runs the future server on the same machine; on a
  // hall LAN the browser would refuse the mixed content anyway, so
  // refusing it here just makes the reason legible.
  const localHttp =
    url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  if (url.protocol !== 'https:' && !localHttp) return { kind: 'invalid' };
  // Credentials in the URL would be sent to a host the operator confirmed
  // by hostname alone, and a hash on `api` would survive into the paths
  // built from it. Neither has an honest use here.
  if (url.username !== '' || url.password !== '') return { kind: 'invalid' };
  if (url.hash !== '') return { kind: 'invalid' };

  // Trailing slash off, so `{api}/v1/...` never doubles up. An optional
  // path prefix is kept: a club may host the API under a sub-path.
  const api = url.origin + url.pathname.replace(/\/+$/, '');
  if (token === null) return { kind: 'incomplete' };
  return { kind: 'ok', api, host: url.hostname, token };
}
