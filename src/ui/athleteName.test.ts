import { describe, expect, it } from 'vitest';
import { composeAthleteName, splitAthleteName } from './athleteName';

describe('splitAthleteName', () => {
  it('splits a surname in caps from a given name in title case', () => {
    expect(splitAthleteName('BOUBA Daikii')).toEqual({ surname: 'BOUBA', given: 'Daikii' });
  });

  it('keeps a multi-word surname together', () => {
    expect(splitAthleteName('NERY GAGO Miguel')).toEqual({ surname: 'NERY GAGO', given: 'Miguel' });
  });

  it('keeps a multi-word given name together', () => {
    expect(splitAthleteName('KIM Se Heon')).toEqual({ surname: 'KIM', given: 'Se Heon' });
  });

  // Diacritics: an upper-case Č is still upper case, and must not end the surname.
  it('treats accented capitals as part of the surname', () => {
    expect(splitAthleteName('ČRNOBRNJA Aleksandar')).toEqual({ surname: 'ČRNOBRNJA', given: 'Aleksandar' });
  });

  it('takes a name with no lower-case part as surname only', () => {
    expect(splitAthleteName('ABE')).toEqual({ surname: 'ABE', given: '' });
  });

  // A name typed without caps has no surname to pick out; the whole line is
  // the given part so it renders regular rather than bold and unbroken.
  it('takes a name with no capitalised word as given only', () => {
    expect(splitAthleteName('bouba daikii')).toEqual({ surname: '', given: 'bouba daikii' });
  });

  it('ignores surrounding and doubled spaces', () => {
    expect(splitAthleteName('  BOUBA   Daikii ')).toEqual({ surname: 'BOUBA', given: 'Daikii' });
  });

  it('is empty for an empty name', () => {
    expect(splitAthleteName('')).toEqual({ surname: '', given: '' });
  });
});

describe('composeAthleteName', () => {
  it('capitalises the surname so the board can pick it out', () => {
    expect(composeAthleteName('Nakamura', 'Yoshihiro')).toBe('NAKAMURA Yoshihiro');
  });

  it('leaves a surname already typed in caps alone', () => {
    expect(composeAthleteName('MUKI', 'Sagi')).toBe('MUKI Sagi');
  });

  it('keeps a multi-word surname whole', () => {
    expect(composeAthleteName('Nery Gago', 'Miguel')).toBe('NERY GAGO Miguel');
  });

  it('takes either half alone', () => {
    expect(composeAthleteName('Abe', '')).toBe('ABE');
    expect(composeAthleteName('', 'Vanya')).toBe('Vanya');
  });

  it('is empty when both halves are', () => {
    expect(composeAthleteName('   ', '')).toBe('');
  });

  it('trims what the operator typed', () => {
    expect(composeAthleteName('  Nakamura  ', '  Yoshihiro ')).toBe('NAKAMURA Yoshihiro');
  });

  // The two functions are the two ends of one convention: what the panel
  // joins, the board must split back into the same halves.
  it('composes what the board splits back', () => {
    expect(splitAthleteName(composeAthleteName('Nakamura', 'Yoshihiro'))).toEqual({
      surname: 'NAKAMURA',
      given: 'Yoshihiro',
    });
  });
});
