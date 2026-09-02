import ijfLogoUrl from '../../assets/ijf-logo.svg';
import { COUNTRIES } from '../../data/countries';

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

/**
 * The flag for a three-letter code.
 *
 * Country files are copied into public/flags/ named by the IJF code (see
 * scripts/make-countries.mjs), which is why this is a template string and not
 * a lookup: the app carries no ISO mapping at all.
 *
 * IJF, IRT and AIN are not countries and have no file. They draw the
 * federation roundel already bundled for the venue-logo fallback — which is
 * exactly what ijf.org serves for IJF and IRT. An unrecognised code lands
 * there too: a saved contest from another build must not put a broken image
 * in front of a hall.
 */
export function flagUrl(code: string): string {
  const iso = BY_CODE.get(code)?.iso;
  return iso ? `${import.meta.env.BASE_URL}flags/${code}.svg` : ijfLogoUrl;
}
