import { hasIppon } from './matchState';
import type { SideState } from './matchState';

/**
 * The single number an IJF venue board shows per athlete. SOR Articles 14-15
 * name the values on the board directly — "Waza-ari (10 points on the
 * scoreboard)", "Yuko (1 point on the scoreboard)" — so a waza-ari and a yuko
 * read as 11 rather than as two separate cells.
 *
 * This never reaches 20: two waza-ari are waza-ari-awasete-ippon, which
 * hasIppon reports and scoreText prints as a word.
 */
export function compositeScore(s: SideState): number {
  return s.wazaari * 10 + s.yuko;
}

/**
 * SOR Article 14 says ippon is "100 points marked as ippon on the
 * scoreboard" — the word, not the number, which is what the footage shows on
 * the venue board too.
 */
export function scoreText(s: SideState): string {
  return hasIppon(s) ? 'IPPON' : String(compositeScore(s));
}
