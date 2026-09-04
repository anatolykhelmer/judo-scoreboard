import { osaekomiElapsed } from '../../../engine/clock';
import type { Side, SideState } from '../../../engine/matchState';
import { hasIppon } from '../../../engine/matchState';
import { MAX_SHIDO } from '../../../engine/rules';
import { scoreText } from '../../../engine/score';
import { clockTextShort } from '../../useNow';
import { clockTone } from '../clockTone';
import { flagUrl, isRoundel } from '../flagUrl';
import { splitAthleteName } from './athleteName';
import type { BoardProps } from '../themes';
import './ijf.css';

/** Upright, square-cornered yellow cards, as on the venue board. The third shido is hansoku-make. */
function ShidoCards({ count }: { count: number }) {
  if (count >= MAX_SHIDO) return <span className="ijf-card ijf-card--red" />;
  return Array.from({ length: count }, (_, i) => <span key={i} className="ijf-card" />);
}

/**
 * The national flag, or the federation roundel for the three IJF identities
 * and for a code this build does not know. The roundel is drawn as a circle
 * rather than stretched into the rectangular flag box: it is a logo, not a
 * flag, and the hall should read it as one.
 *
 * The wrapper is what fixes the size. Country files are SVGs of assorted
 * aspect ratios and no useful intrinsic size, so an unboxed <img> takes the
 * whole row; the box also keeps the code starting in the same place whether
 * the band shows a flag or the narrower roundel.
 */
function Flag({ country }: { country: string }) {
  const roundel = isRoundel(country);
  return (
    <span className="ijf-flagbox">
      <img
        className={`ijf-flag${roundel ? ' ijf-flag--roundel' : ''}`}
        src={flagUrl(country)}
        alt=""
      />
    </span>
  );
}

function Band({
  side,
  athlete,
  nameAt,
}: {
  side: Side;
  athlete: SideState;
  /** Which edge of the band the name line sits on. */
  nameAt: 'top' | 'bottom';
}) {
  // The name is inside the band and takes the band's own colours — dark on
  // white, light on blue — and hugs the band's outer edge, so the two names
  // sit as far apart as the board allows. That is what the venue board does;
  // an earlier revision put both names on the black background instead.
  // Surname bold, given name regular, as the board prints them; the split is
  // splitAthleteName's rule. The space between is real text, so an ellipsis
  // on an over-long name falls where it would in the plain string. The inner
  // span is what holds it: .ijf-name is a flex box (that is how the line is
  // centred in its strip), and a flex box throws away a whitespace-only text
  // node between two children — the space vanished — and only ellipsizes its
  // own inline content, which the two spans are not.
  const { surname, given } = splitAthleteName(athlete.name);
  const name = (
    <div className="ijf-name">
      <span className="ijf-name__line">
        {surname && <span className="ijf-name__surname">{surname}</span>}
        {surname && given && ' '}
        {given && <span className="ijf-name__given">{given}</span>}
      </span>
    </div>
  );

  return (
    <div className={`ijf-band ijf-band--${side}`}>
      {nameAt === 'top' && name}

      {/* The row hugs the band's outer edge, opposite the name: code and score
          share a baseline on the white band and a cap line on the blue —
          see .ijf-row--hug-top. */}
      <div className={`ijf-row ijf-row--hug-${nameAt === 'top' ? 'bottom' : 'top'}`}>
        <Flag country={athlete.country} />
        <span className="ijf-code">{athlete.country}</span>
        <span className={`ijf-score${hasIppon(athlete) ? ' ijf-score--ippon' : ''}`}>
          {scoreText(athlete)}
        </span>
        <span className="ijf-shido">
          <ShidoCards count={athlete.shido} />
        </span>
      </div>

      {nameAt === 'bottom' && name}
    </div>
  );
}

export function IjfBoard({ state, now }: BoardProps) {
  // Fixed, and deliberately not state.swapSides — the same reasoning as the
  // modern board: that flag mirrors the operator's panel to match the corners
  // as they face the table, and the hall's board must not move under an
  // audience that has already learnt to read it.
  const top: Side = 'white';
  const bottom: Side = 'blue';

  // Whole seconds, unpadded — "5", not "05": the modern board's padded
  // formatOsaekomi is the wrong shape for a circle.
  const held = state.osaekomi.side !== null;
  const holdSeconds = Math.floor(osaekomiElapsed(state.osaekomi, now) / 1000);

  return (
    // The stage is the black surround; the board itself keeps the venue
    // panel's own 2.46:1 shape inside it rather than stretching to the screen.
    <div className="ijf-stage">
      <div className="ijf-board">
        <Band side={top} athlete={state[top]} nameAt="top" />
        <Band side={bottom} athlete={state[bottom]} nameAt="bottom" />

        <div className="ijf-foot">
          <div className="ijf-foot__bout">
            {state.round && <span className="ijf-round">{state.round}</span>}
            <span className="ijf-category">{state.category}</span>
          </div>

          {/* The real venue board carries no logo at all, so nothing is drawn
              here unless the venue has actually supplied one — the federation
              roundel is never used as a filler. */}
          {state.logoDataUrl && (
            <div className="ijf-foot__logo">
              <img src={state.logoDataUrl} alt="" />
            </div>
          )}

          <div className={`ijf-foot__clock${state.goldenScore ? ' ijf-foot__clock--gs' : ''}`}>
            <div className={`ijf-clock ijf-clock--${clockTone(state)}`}>
              {clockTextShort(state, now)}
            </div>
            {state.goldenScore && <span className="ijf-gs">Golden score</span>}
          </div>

          {/* The osaekomi counter: a white circle at the black band's right
              end, visible only while a hold runs. It does not say who is
              holding — the mat knows. The element stays in the layout when
              idle so the clock keeps its place; see .ijf-osaekomi--idle. An
              earlier revision put the counter inside the holding athlete's
              band instead, which is what a different venue's board did. */}
          <div className={`ijf-osaekomi${held ? '' : ' ijf-osaekomi--idle'}`}>{holdSeconds}</div>
        </div>
      </div>
    </div>
  );
}
