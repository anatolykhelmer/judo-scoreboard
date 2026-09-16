import ijfLogoUrl from '../../assets/ijf-logo.svg';
import { COUNTRIES } from '../../data/countries';

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

/**
 * True when a code draws the federation roundel rather than a national flag.
 *
 * IJF, IRT and AIN are not countries and have no flag file — they draw the
 * roundel, which is exactly what ijf.org serves for IJF and IRT. An
 * unrecognised code lands there too: a saved contest from another build must
 * not put a broken image in front of a hall.
 *
 * Boards need this as well as the URL, because the roundel is a circular logo
 * and must not be drawn in the rectangular box a flag gets.
 */
export function isRoundel(code: string): boolean {
  // The three IJF identities are in the table with a null iso, and an
  // unknown code is not in it at all; both mean 'no flag file'.
  return !BY_CODE.get(code)?.iso;
}

/**
 * The flag for a three-letter code.
 *
 * Country files are copied into public/flags/ named by the IJF code (see
 * scripts/make-countries.mjs), which is why this is a template string and not
 * a lookup: the app carries no ISO mapping at all.
 */
export function flagUrl(code: string): string {
  return isRoundel(code) ? ijfLogoUrl : `${import.meta.env.BASE_URL}flags/${code}.svg`;
}
