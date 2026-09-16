import { osaekomiElapsed } from '../../../engine/clock';
import type { Side, SideState } from '../../../engine/matchState';
import { hasIppon } from '../../../engine/matchState';
import { MAX_SHIDO } from '../../../engine/rules';
import { scoreText } from '../../../engine/score';
import { clockTextShort } from '../../useNow';
import { splitAthleteName } from '../../athleteName';
import { clockTone } from '../clockTone';
import { flagUrl, isRoundel } from '../flagUrl';
import { holdFill } from '../ijf/holdFill';
import type { BoardProps } from '../themes';
import './tv.css';

/*
 * The TV theme: the IJF board's content (SOR Appendix F1.2, composite score,
 * shido cards, osaekomi counter and fill) laid out to fill a 16:9 screen
 * rather than letterboxed at the venue panel's 2.46:1.
 *
 * Two athlete panels side by side in the judogi colours, the bottom band
 * holding round and category at the left, the clock centred, the osaekomi
 * counter at the right. The blue panel mirrors the white one so the two
 * scores meet at the centre of the screen.
 */

/** Upright yellow cards; the third shido is the red hansoku-make card. */
function ShidoCards({ count }: { count: number }) {
  if (count >= MAX_SHIDO) return <span className="tv-card tv-card--red" />;
  return Array.from({ length: count }, (_, i) => <span key={i} className="tv-card" />);
}

function Flag({ country }: { country: string }) {
  const roundel = isRoundel(country);
  return (
    <img
      className={`tv-flag${roundel ? ' tv-flag--roundel' : ''}`}
      src={flagUrl(country)}
      alt=""
    />
  );
}

function Panel({
  side,
  athlete,
  fill,
}: {
  side: Side;
  athlete: SideState;
  /** How far the osaekomi fill has crossed the panel, or null when idle. */
  fill: number | null;
}) {
  const { surname, given } = splitAthleteName(athlete.name);
  return (
    <div className={`tv-panel tv-panel--${side}`}>
      <div className="tv-panel__head">
        <Flag country={athlete.country} />
        <span className="tv-code">{athlete.country}</span>
      </div>

      <div className="tv-name">
        <span className="tv-name__line">
          {surname && <span className="tv-name__surname">{surname}</span>}
          {surname && given && ' '}
          {given && <span className="tv-name__given">{given}</span>}
        </span>
      </div>

      <div className="tv-panel__foot">
        <span className="tv-shido">
          <ShidoCards count={athlete.shido} />
        </span>
        <span className={`tv-score${hasIppon(athlete) ? ' tv-score--ippon' : ''}`}>
          {scoreText(athlete)}
        </span>
      </div>

      {/* The hold's share of the twenty seconds to ippon, as a bar along
          the panel's bottom edge. Width is data, so it is inline. */}
      {fill !== null && <div className="tv-hold" style={{ width: `${fill * 100}%` }} />}
    </div>
  );
}

export function TvBoard({ state, now }: BoardProps) {
  // White left, blue right, never swapped — same reasoning as the other two
  // boards: swapSides orders the operator's panel, not the hall's display.
  const left: Side = 'white';
  const right: Side = 'blue';

  const holding = state.osaekomi.side;
  const holdSeconds = Math.floor(osaekomiElapsed(state.osaekomi, now) / 1000);

  return (
    <div className="tv-stage">
      <div className="tv-board">
        <div className="tv-panels">
          <Panel side={left} athlete={state[left]} fill={holdFill(state.osaekomi, left, now)} />
          <Panel side={right} athlete={state[right]} fill={holdFill(state.osaekomi, right, now)} />
        </div>

        <div className="tv-foot">
          <div className="tv-bout">
            {state.round && <span className="tv-round">{state.round}</span>}
            <span className="tv-category">{state.category}</span>
          </div>

          <div className="tv-foot__clock">
            <div className={`tv-clock tv-clock--${clockTone(state)}`}>
              {clockTextShort(state, now)}
            </div>
            {state.goldenScore && <span className="tv-gs">Golden score</span>}
          </div>

          {/* Kept in the layout while idle (visibility, not display) so the
              clock does not move when a hold starts. */}
          <div className={`tv-osaekomi${holding ? '' : ' tv-osaekomi--idle'}`}>
            <span className="tv-osaekomi__label">Osaekomi</span>
            <span className="tv-osaekomi__seconds">{holdSeconds}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
