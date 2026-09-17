import { describe, expect, it } from 'vitest';
import { createInitialState, createSideState } from '../engine/matchState';
import type { MatchState } from '../engine/matchState';
import { claimContest, postResult } from './client';

const API = 'https://api.example.org';
const TOKEN = 'tok_abc';
const PANEL_ID = 'panel-1';

const CONTEST = {
  version: 1,
  contest: {
    white: { name: 'KOGA Toshihiko', country: 'JPN' },
    blue: { name: 'DOUILLET David', country: 'FRA' },
    category: '-71 kg',
    durationMs: 240000,
    round: 'FINAL',
  },
};

const FINISHED: MatchState = {
  ...createInitialState(),
  phase: 'finished',
  clock: { running: false, startedAt: null, elapsedMs: 125000 },
  white: { ...createSideState('KOGA Toshihiko', 'JPN'), ippon: true },
  blue: createSideState('DOUILLET David', 'FRA'),
  winner: { side: 'white', reason: 'ippon', causedBy: { side: 'white', type: 'ippon' } },
};

interface Call {
  url: string;
  init: RequestInit;
}

/** Answers every request with one canned response, and records what was sent. */
function recording(status: number, body: unknown): { fetch: typeof fetch; calls: Call[] } {
  const calls: Call[] = [];
  const fetchFn = (async (url: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });
    return new Response(body === undefined ? null : JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
  return { fetch: fetchFn, calls };
}

const throwingFetch = (async () => {
  throw new TypeError('Failed to fetch');
}) as unknown as typeof fetch;

function bodyOf(call: Call): Record<string, unknown> {
  return JSON.parse(String(call.init.body)) as Record<string, unknown>;
}

describe('claimContest', () => {
  it('POSTs JSON to the claim path the panel builds', async () => {
    const { fetch, calls } = recording(200, CONTEST);
    await claimContest({ api: API, token: TOKEN, panelId: PANEL_ID, fetch });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.example.org/v1/contests/tok_abc/claim');
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].init.credentials).toBe('omit');
    expect(calls[0].init.headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('omits pin unless one was given, and never sends an empty one', async () => {
    const plain = recording(200, CONTEST);
    await claimContest({ api: API, token: TOKEN, panelId: PANEL_ID, fetch: plain.fetch });
    expect(bodyOf(plain.calls[0])).toEqual({ panelId: PANEL_ID });

    const blank = recording(200, CONTEST);
    await claimContest({ api: API, token: TOKEN, panelId: PANEL_ID, pin: '', fetch: blank.fetch });
    expect(bodyOf(blank.calls[0])).toEqual({ panelId: PANEL_ID });

    const withPin = recording(200, CONTEST);
    await claimContest({ api: API, token: TOKEN, panelId: PANEL_ID, pin: '1234', fetch: withPin.fetch });
    expect(bodyOf(withPin.calls[0])).toEqual({ panelId: PANEL_ID, pin: '1234' });
  });

  it('returns the parsed contest on 200', async () => {
    const { fetch } = recording(200, CONTEST);
    expect(await claimContest({ api: API, token: TOKEN, panelId: PANEL_ID, fetch })).toEqual({
      ok: true,
      contest: {
        white: { name: 'KOGA Toshihiko', country: 'JPN' },
        blue: { name: 'DOUILLET David', country: 'FRA' },
        category: '-71 kg',
        durationMs: 240000,
        round: 'FINAL',
      },
    });
  });

  it('refuses a 200 whose body is not a contest', async () => {
    const { fetch } = recording(200, { version: 2 });
    expect(await claimContest({ api: API, token: TOKEN, panelId: PANEL_ID, fetch })).toEqual({
      ok: false,
      error: 'invalid_payload',
    });
  });

  it.each([
    [403, { error: 'pin_required' }, 'pin_required'],
    [403, { error: 'pin_invalid' }, 'pin_invalid'],
    [403, {}, 'pin_required'],
    [404, null, 'not_found'],
    [409, { error: 'claimed' }, 'claimed'],
    [410, null, 'expired'],
    [500, null, 'network'],
  ])('maps HTTP %i to %s', async (status, body, error) => {
    const { fetch } = recording(status, body);
    expect(await claimContest({ api: API, token: TOKEN, panelId: PANEL_ID, fetch })).toEqual({
      ok: false,
      error,
    });
  });

  it('maps a thrown fetch to network', async () => {
    expect(
      await claimContest({ api: API, token: TOKEN, panelId: PANEL_ID, fetch: throwingFetch }),
    ).toEqual({ ok: false, error: 'network' });
  });
});

describe('postResult', () => {
  it('POSTs the report to the result path', async () => {
    const { fetch, calls } = recording(200, { nextToken: 'tok_next' });
    await postResult({ api: API, token: TOKEN, panelId: PANEL_ID, state: FINISHED, fetch });

    expect(calls[0].url).toBe('https://api.example.org/v1/contests/tok_abc/result');
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].init.credentials).toBe('omit');
    expect(calls[0].init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(bodyOf(calls[0])).toMatchObject({
      version: 1,
      panelId: PANEL_ID,
      result: { elapsedMs: 125000, winner: FINISHED.winner },
    });
  });

  it('reads the next ticket, and a day that has ended', async () => {
    const next = recording(200, { nextToken: 'tok_next' });
    expect(
      await postResult({ api: API, token: TOKEN, panelId: PANEL_ID, state: FINISHED, fetch: next.fetch }),
    ).toEqual({ ok: true, nextToken: 'tok_next' });

    const done = recording(200, { nextToken: null });
    expect(
      await postResult({ api: API, token: TOKEN, panelId: PANEL_ID, state: FINISHED, fetch: done.fetch }),
    ).toEqual({ ok: true, nextToken: null });
  });

  it('refuses a 200 that does not answer with a usable next token', async () => {
    for (const body of [{}, { nextToken: 'a/b' }, { nextUrl: 'https://evil.example' }]) {
      const { fetch } = recording(200, body);
      expect(
        await postResult({ api: API, token: TOKEN, panelId: PANEL_ID, state: FINISHED, fetch }),
      ).toEqual({ ok: false, error: 'invalid_next' });
    }
  });

  it.each([
    [403, 'forbidden'],
    [404, 'not_found'],
    [409, 'claimed'],
    [410, 'expired'],
    [500, 'network'],
  ])('maps HTTP %i to %s', async (status, error) => {
    const { fetch } = recording(status, null);
    expect(
      await postResult({ api: API, token: TOKEN, panelId: PANEL_ID, state: FINISHED, fetch }),
    ).toEqual({ ok: false, error });
  });

  it('maps a thrown fetch to network', async () => {
    expect(
      await postResult({ api: API, token: TOKEN, panelId: PANEL_ID, state: FINISHED, fetch: throwingFetch }),
    ).toEqual({ ok: false, error: 'network' });
  });
});
