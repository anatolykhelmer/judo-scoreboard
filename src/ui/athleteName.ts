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

/**
 * The other end of the same convention: the panel takes the surname and the
 * given name in two fields, the state carries them as one string, and this
 * is the join. The upper-casing is the point of it — splitAthleteName reads
 * *leading capitalised words* as the surname, so an operator who types
 * "Nakamura" has to reach the board as "NAKAMURA" or the board finds no
 * surname at all and prints the whole line in the given name's regular
 * weight. That is exactly what happened while the panel had one free-text
 * field.
 *
 * Either half may be empty: a draw sheet that carries only a surname, or a
 * club event where the children are down as first names alone.
 */
export function composeAthleteName(surname: string, given: string): string {
  return [surname.trim().toUpperCase(), titleCaseUpperWords(given)].filter(Boolean).join(' ');
}

/**
 * The given half must not be all upper case, or splitAthleteName reads it as
 * more surname and the board prints the whole line bold — which is what a
 * name pasted off a draw sheet, or typed with Caps Lock on, would do. Each
 * word that is entirely upper case comes down to a capital and lower case;
 * a word with any lower case in it is the operator's own casing and is
 * left alone, so "McDonald" survives. Word by word, so "SE HEON" becomes
 * "Se Heon" rather than "Se heon".
 */
function titleCaseUpperWords(given: string): string {
  return given
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => (isUpperWord(word) ? word[0] + word.slice(1).toLowerCase() : word))
    .join(' ');
}

function isUpperWord(word: string): boolean {
  return word === word.toUpperCase() && word !== word.toLowerCase();
}
