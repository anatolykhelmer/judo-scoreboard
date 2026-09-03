/**
 * The board prints "BOUBA Daikii" in two weights — surname bold, given name
 * regular — but the contest carries the name as one string, so the split is
 * a display rule: every leading word that is entirely upper case is surname,
 * and the first word that is not begins the given name. That is how the IJF
 * writes names ("NERY GAGO Miguel", "KIM Se Heon"), so a multi-word surname
 * and a multi-word given name both come out right.
 *
 * A word is upper case when uppercasing changes nothing and lowercasing does
 * — the second test is what stops a bare hyphen or digit from counting.
 * Accented capitals pass it, so "ČRNOBRNJA" stays whole.
 */
export function splitAthleteName(name: string): { surname: string; given: string } {
  const words = name.trim().split(/\s+/).filter(Boolean);
  let i = 0;
  while (i < words.length && isUpperWord(words[i])) i++;
  return { surname: words.slice(0, i).join(' '), given: words.slice(i).join(' ') };
}

function isUpperWord(word: string): boolean {
  return word === word.toUpperCase() && word !== word.toLowerCase();
}
