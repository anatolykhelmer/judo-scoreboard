import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { COUNTRIES, DEFAULT_COUNTRY } from './countries';

// process.cwd(), not __dirname: these files are ESM under vitest, where
// __dirname does not exist at all.
const flagDir = path.resolve(process.cwd(), 'public', 'flags');

describe('COUNTRIES', () => {
  it('has no duplicate codes', () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('offers the three IJF identities that are not countries', () => {
    for (const code of ['IJF', 'IRT', 'AIN']) {
      const row = COUNTRIES.find((c) => c.code === code);
      expect(row, code).toBeDefined();
      expect(row?.iso, code).toBeNull();
    }
  });

  it('resolves the default country', () => {
    expect(COUNTRIES.find((c) => c.code === DEFAULT_COUNTRY)).toBeDefined();
  });

  // The board resolves a flag as flags/<CODE>.svg with no fallback for a
  // country row, so a row without its file is a broken image in a hall.
  it('ships a flag file for every country', () => {
    const withoutFlag = COUNTRIES
      .filter((c) => c.iso !== null)
      .filter((c) => !existsSync(path.join(flagDir, `${c.code}.svg`)))
      .map((c) => c.code);
    expect(withoutFlag).toEqual([]);
  });

  it('has enough of the world to run a tournament', () => {
    expect(COUNTRIES.length).toBeGreaterThan(200);
  });
});
