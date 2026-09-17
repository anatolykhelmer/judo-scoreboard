import { describe, expect, it } from 'vitest';
import { createInitialState } from '../engine/matchState';
import type { Persisted } from '../sync/channel';
import type { ServerLink } from './parseLink';
import {
  clearSession,
  getOrCreatePanelId,
  loadSession,
  PANEL_ID_KEY,
  resolveToken,
  resultOwed,
  saveSession,
  SESSION_KEY,
  serverResumable,
} from './session';

function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() { return map.size; },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => { map.delete(k); },
    setItem: (k: string, v: string) => { map.set(k, v); },
  } as Storage;
}

const LINK: Extract<ServerLink, { kind: 'ok' }> = {
  kind: 'ok',
  api: 'https://api.example.org',
  host: 'api.example.org',
  token: 'tok_entry',
};

function persisted(phase: Persisted['state']['phase']): Persisted {
  return { state: { ...createInitialState(), phase }, savedAt: 1_000 };
}

describe('getOrCreatePanelId', () => {
  it('mints one id and reuses it, even across a Strict Mode remount', () => {
    const storage = fakeStorage();
    const ids = ['id-1', 'id-2'];
    const randomUUID = () => ids.shift() ?? 'exhausted';

    expect(getOrCreatePanelId(storage, randomUUID)).toBe('id-1');
    expect(getOrCreatePanelId(storage, randomUUID)).toBe('id-1');
    expect(storage.getItem(PANEL_ID_KEY)).toBe('id-1');
  });

  it('ignores an empty stored id and mints a new one', () => {
    const storage = fakeStorage();
    storage.setItem(PANEL_ID_KEY, '');
    expect(getOrCreatePanelId(storage, () => 'id-1')).toBe('id-1');
  });
});

describe('loadSession', () => {
  it('reads back what saveSession wrote', () => {
    const storage = fakeStorage();
    saveSession(storage, { api: 'https://api.example.org', token: 'tok_abc' });
    expect(loadSession(storage)).toEqual({ api: 'https://api.example.org', token: 'tok_abc' });
  });

  it('is null for no storage, junk, a missing api, or a missing token', () => {
    expect(loadSession(null)).toBeNull();

    const storage = fakeStorage();
    expect(loadSession(storage)).toBeNull();

    storage.setItem(SESSION_KEY, 'not json');
    expect(loadSession(storage)).toBeNull();

    storage.setItem(SESSION_KEY, JSON.stringify({ token: 'tok_abc' }));
    expect(loadSession(storage)).toBeNull();

    storage.setItem(SESSION_KEY, JSON.stringify({ api: 'https://api.example.org' }));
    expect(loadSession(storage)).toBeNull();
  });

  it('is null for a token that could rewrite the path', () => {
    const storage = fakeStorage();
    storage.setItem(SESSION_KEY, JSON.stringify({ api: 'https://api.example.org', token: 'a/b' }));
    expect(loadSession(storage)).toBeNull();
  });

  it('clearSession removes it', () => {
    const storage = fakeStorage();
    saveSession(storage, { api: 'https://api.example.org', token: 'tok_abc' });
    clearSession(storage);
    expect(loadSession(storage)).toBeNull();
  });

  it('survives storage being absent', () => {
    expect(() => saveSession(null, { api: 'a', token: 'b' })).not.toThrow();
    expect(() => clearSession(null)).not.toThrow();
  });
});

describe('the owed-result marker', () => {
  it('round-trips through storage', () => {
    const storage = fakeStorage();
    saveSession(storage, { api: LINK.api, token: 'tok_entry', owed: true });
    expect(loadSession(storage)).toEqual({ api: LINK.api, token: 'tok_entry', owed: true });
  });

  it('is absent, not false, on a session that owes nothing', () => {
    const storage = fakeStorage();
    saveSession(storage, { api: LINK.api, token: 'tok_entry' });
    expect(loadSession(storage)).toEqual({ api: LINK.api, token: 'tok_entry' });
  });

  it('is ignored unless it is exactly true', () => {
    const storage = fakeStorage();
    storage.setItem(
      SESSION_KEY,
      JSON.stringify({ api: LINK.api, token: 'tok_entry', owed: 'yes' }),
    );
    expect(loadSession(storage)?.owed).toBeUndefined();
  });
});

describe('resultOwed', () => {
  const owedSession = { api: LINK.api, token: 'tok_entry', owed: true };

  it('is true for a finished contest whose report never landed', () => {
    expect(resultOwed(persisted('finished'), owedSession, 'tok_entry')).toBe(true);
  });

  it('is false when the session does not say a report is owed', () => {
    expect(resultOwed(persisted('finished'), { api: LINK.api, token: 'tok_entry' }, 'tok_entry'))
      .toBe(false);
    expect(resultOwed(persisted('finished'), null, 'tok_entry')).toBe(false);
  });

  it('is false when the owed report belongs to another ticket', () => {
    expect(resultOwed(persisted('finished'), owedSession, 'tok_next')).toBe(false);
  });

  it('is false when the saved contest is not finished', () => {
    // Nothing to report: the marker outlived the contest it referred to.
    expect(resultOwed(persisted('paused'), owedSession, 'tok_entry')).toBe(false);
    expect(resultOwed(persisted('setup'), owedSession, 'tok_entry')).toBe(false);
    expect(resultOwed(null, owedSession, 'tok_entry')).toBe(false);
  });
});

describe('resolveToken', () => {
  it('prefers the stored token for this api, so a reload does not restart the day', () => {
    expect(resolveToken(LINK, { api: LINK.api, token: 'tok_third_bout' })).toBe('tok_third_bout');
  });

  it('falls back to the hash when there is no session or it belongs to another api', () => {
    expect(resolveToken(LINK, null)).toBe('tok_entry');
    expect(resolveToken(LINK, { api: 'https://other.example.org', token: 'tok_other' })).toBe(
      'tok_entry',
    );
  });
});

describe('serverResumable', () => {
  const session = { api: LINK.api, token: 'tok_entry' };

  it('is true only for a contest past setup on this api and this token', () => {
    expect(serverResumable(persisted('paused'), LINK, session, 'tok_entry')).toBe(true);
  });

  it('is false without a server link', () => {
    expect(serverResumable(persisted('paused'), { kind: 'absent' }, session, 'tok_entry')).toBe(
      false,
    );
    expect(serverResumable(persisted('paused'), { kind: 'invalid' }, session, 'tok_entry')).toBe(
      false,
    );
  });

  it('is false when there is nothing to resume', () => {
    expect(serverResumable(null, LINK, session, 'tok_entry')).toBe(false);
    expect(serverResumable(persisted('setup'), LINK, session, 'tok_entry')).toBe(false);
  });

  it('is false on the first claim of a link, so a leftover local bout is not adopted', () => {
    expect(serverResumable(persisted('paused'), LINK, null, 'tok_entry')).toBe(false);
  });

  it('is false when the saved contest belongs to another api or another ticket', () => {
    expect(
      serverResumable(persisted('paused'), LINK, { api: 'https://other.example.org', token: 'tok_entry' }, 'tok_entry'),
    ).toBe(false);
    expect(serverResumable(persisted('paused'), LINK, session, 'tok_next')).toBe(false);
  });
});
