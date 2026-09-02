import { formatOsaekomi, osaekomiElapsed } from '../../../engine/clock';
import type { Side, SideState } from '../../../engine/matchState';
import { hasIppon } from '../../../engine/matchState';
import { MAX_SHIDO } from '../../../engine/rules';
import { scoreText } from '../../../engine/score';
import ijfLogoUrl from '../../../assets/ijf-logo.svg';
import { clockText } from '../../useNow';
import { clockTone } from '../clockTone';
import { flagUrl } from '../flagUrl';
import type { BoardProps } from '../themes';
import './ijf.css';

/** Small tilted cards, as on the venue board. The third shido is hansoku-make. */
function ShidoCards({ count }: { count: number }) {
  if (count >= MAX_SHIDO) return <span className="ijf-card ijf-card--red" />;
  if (count === 2) {
    return (
      <>
        <span className="ijf-card ijf-card--back" />
        <span className="ijf-card ijf-card--front" />
      </>
    );
  }
  if (count === 1) return <span className="ijf-card" />;
  return null;
}

function Band({
  side,
  athlete,
  holdText,
}: {
  side: Side;
  athlete: SideState;
  /** The hold counter, or null when this athlete is not holding. */
  holdText: string | null;
}) {
  const text = scoreText(athlete);
  return (
    <div className={`ijf-band ijf-band--${side}`}>
      <img className="ijf-flag" src={flagUrl(athlete.country)} alt="" />
      <span className="ijf-code">{athlete.country}</span>
      <span className={`ijf-score${hasIppon(athlete) ? ' ijf-score--ippon' : ''}`}>{text}</span>
      <span className="ijf-shido">
        <ShidoCards count={athlete.shido} />
      </span>
      <span className="ijf-hold">{holdText}</span>
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

  const held = state.osaekomi.side;
  const holdText = held ? formatOsaekomi(osaekomiElapsed(state.osaekomi, now)) : null;

  return (
    <div className="ijf-board">
      <div className="ijf-name">{state[top].name}</div>

      <Band side={top} athlete={state[top]} holdText={held === top ? holdText : null} />
      <Band side={bottom} athlete={state[bottom]} holdText={held === bottom ? holdText : null} />

      <div className="ijf-name">{state[bottom].name}</div>

      <div className="ijf-foot">
        <div className="ijf-foot__bout">
          {state.round && <span className="ijf-round">{state.round}</span>}
          <span className="ijf-category">{state.category}</span>
        </div>

        <div className="ijf-foot__logo">
          <img src={state.logoDataUrl ?? ijfLogoUrl} alt="" />
        </div>

        <div className="ijf-foot__clock">
          <div className={`ijf-clock ijf-clock--${clockTone(state)}`}>
            {/* Every unlit segment of the panel, under the live digits. */}
            <span className="ijf-clock__ghost" aria-hidden="true">88:88</span>
            <span>{clockText(state, now)}</span>
          </div>
          {state.goldenScore && <span className="ijf-gs">Golden score</span>}
        </div>
      </div>
    </div>
  );
}
