import { describe, expect, it } from 'vitest';
import { isContestToken, parseServerLink } from './parseLink';

describe('parseServerLink', () => {
  it('is absent when api is missing, even if the hash has a token', () => {
    expect(parseServerLink({ search: '?role=panel', hash: '#c=abc' })).toEqual({ kind: 'absent' });
  });

  it('is incomplete when api is present but the hash token is missing', () => {
    expect(parseServerLink({ search: '?api=https://api.example.org', hash: '' })).toEqual({
      kind: 'incomplete',
    });
  });

  it('accepts https api and a hash token, stripping a trailing slash', () => {
    expect(parseServerLink({
      search: '?role=panel&api=https://api.example.org/judo/',
      hash: '#c=tok_abc',
    })).toEqual({
      kind: 'ok',
      api: 'https://api.example.org/judo',
      host: 'api.example.org',
      token: 'tok_abc',
    });
  });

  it('rejects http that is not localhost', () => {
    expect(parseServerLink({
      search: '?api=http://192.168.1.5',
      hash: '#c=tok_abc',
    })).toEqual({ kind: 'invalid' });
  });

  it('allows http localhost and 127.0.0.1', () => {
    expect(parseServerLink({
      search: '?api=http://localhost:8787',
      hash: '#c=tok_abc',
    })).toMatchObject({ kind: 'ok', host: 'localhost', token: 'tok_abc' });
    expect(parseServerLink({
      search: '?api=http://127.0.0.1:8787',
      hash: '#c=tok_abc',
    })).toMatchObject({ kind: 'ok', host: '127.0.0.1' });
  });

  it('rejects credentials, a hash on api, and javascript: urls', () => {
    expect(parseServerLink({
      search: '?api=https://user:pass@api.example.org',
      hash: '#c=tok_abc',
    })).toEqual({ kind: 'invalid' });
    expect(parseServerLink({
      search: '?api=https://api.example.org#steal',
      hash: '#c=tok_abc',
    })).toEqual({ kind: 'invalid' });
    expect(parseServerLink({
      search: '?api=javascript:alert(1)',
      hash: '#c=tok_abc',
    })).toEqual({ kind: 'invalid' });
  });

  it('reads a token containing + literally, and the same token percent-encoded', () => {
    // A hash is not a form body. Decoding it as one turns '+' into a space,
    // and the panel would then call a path the server never minted.
    expect(parseServerLink({
      search: '?api=https://api.example.org',
      hash: '#c=ab+cd',
    })).toMatchObject({ kind: 'ok', token: 'ab+cd' });
    expect(parseServerLink({
      search: '?api=https://api.example.org',
      hash: '#c=ab%2Bcd',
    })).toMatchObject({ kind: 'ok', token: 'ab+cd' });
  });

  it('percent-decodes the token and refuses malformed encoding', () => {
    expect(parseServerLink({
      search: '?api=https://api.example.org',
      hash: '#c=a%7Eb',
    })).toMatchObject({ kind: 'ok', token: 'a~b' });
    // A decoded separator is still a separator.
    expect(parseServerLink({
      search: '?api=https://api.example.org',
      hash: '#c=a%2Fb',
    })).toEqual({ kind: 'incomplete' });
    expect(parseServerLink({
      search: '?api=https://api.example.org',
      hash: '#c=a%ZZ',
    })).toEqual({ kind: 'incomplete' });
  });

  it('finds the token among other hash parameters', () => {
    expect(parseServerLink({
      search: '?api=https://api.example.org',
      hash: '#mat=3&c=tok_abc',
    })).toMatchObject({ kind: 'ok', token: 'tok_abc' });
  });

  it('ignores a contest token in the query string', () => {
    expect(parseServerLink({
      search: '?api=https://api.example.org&c=from-query',
      hash: '',
    })).toEqual({ kind: 'incomplete' });
  });
});

describe('isContestToken', () => {
  it('rejects empty, path, query and hash characters', () => {
    expect(isContestToken('')).toBe(false);
    expect(isContestToken('ab/cd')).toBe(false);
    expect(isContestToken('ab?x')).toBe(false);
    expect(isContestToken('ab#x')).toBe(false);
    expect(isContestToken('tok_abc')).toBe(true);
  });
});
