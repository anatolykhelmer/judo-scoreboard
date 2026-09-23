import { COUNTRIES, DEFAULT_COUNTRY } from '../data/countries';
import { splitAthleteName } from '../ui/athleteName';
import type { ContestFields } from './payload';

/**
 * The claimed contest in the shape the setup form's fields hold it: two
 * halves per name, minutes rather than milliseconds, strings throughout.
 *
 * Deliberately not `SETUP_MATCH`. The operator still submits the form —
 * they may have a correction from the marshal, and the panel must not
 * start a contest nobody at the table has looked at.
 */
export interface SetupSeed {
  whiteSurname: string;
  whiteGiven: string;
  blueSurname: string;
  blueGiven: string;
  category: string;
  minutes: string;
  round: string;
  whiteCountry: string;
  blueCountry: string;
}

/**
 * An unknown code would reach the board as a flag that does not exist and
 * three letters nobody recognises, so it comes down to the neutral entry —
 * the same answer the form gives an athlete whose country was never set.
 */
function knownCountry(code: string): string {
  return COUNTRIES.some((c) => c.code === code) ? code : DEFAULT_COUNTRY;
}

/**
 * The contest carries one display string per athlete, matching MatchState;
 * the form takes surname and given name separately. splitAthleteName is
 * the same rule the board reads names by, so composing the two halves back
 * together returns exactly the name the server sent.
 */
export function setupSeedFromContest(contest: ContestFields): SetupSeed {
  const white = splitAthleteName(contest.white.name);
  const blue = splitAthleteName(contest.blue.name);
  return {
    whiteSurname: white.surname,
    whiteGiven: white.given,
    blueSurname: blue.surname,
    blueGiven: blue.given,
    category: contest.category,
    // The field is minutes and accepts halves, so this is a plain divide
    // rather than a round: a 90-second contest must come back as "1.5".
    minutes: String(contest.durationMs / 60_000),
    round: contest.round,
    whiteCountry: knownCountry(contest.white.country),
    blueCountry: knownCountry(contest.blue.country),
  };
}
