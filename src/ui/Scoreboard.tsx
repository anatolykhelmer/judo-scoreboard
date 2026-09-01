import { formatOsaekomi, osaekomiElapsed } from '../engine/clock';
import type { MatchState, Side, SideState } from '../engine/matchState';
import { hasIppon } from '../engine/matchState';
import { clockText } from './useNow';
import ijfLogoUrl from '../assets/ijf-logo.svg';
import './Scoreboard.css';

const PALETTE: Record<Side, { bg: string; className: string }> = {
  white: { bg: '#f0efed', className: 'white-side' },
  blue: { bg: '#005d99', className: 'blue-side' },
};

/** Equal-width digits, matching the original's wrapSpan + `.fixed span` rule. */
function FixedDigits({ text }: { text: string }) {
  return (
    <span className="fixed">
      {[...text].map((char, i) =>
        char === ':' ? char : <span key={i}>{char}</span>,
      )}
    </span>
  );
}

function ScoreCell({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex-fill">
      <div className="d-flex flex-column" style={{ height: '100%' }}>
        <div className="score-digit">{value}</div>
        <div className="score-label">{label}</div>
      </div>
    </div>
  );
}

function ScoreColumn({ side, athlete }: { side: Side; athlete: SideState }) {
  return (
    <div
      className={`score ${PALETTE[side].className}`}
      style={{ width: '36%', height: '100%', backgroundColor: PALETTE[side].bg }}
    >
      <div className="d-flex" style={{ height: '100%' }}>
        <ScoreCell value={hasIppon(athlete) ? 1 : 0} label="Ippon" />
        <ScoreCell value={athlete.wazaari} label="Waza-Ari" />
        <ScoreCell value={athlete.yuko} label="Yuko" />
      </div>
    </div>
  );
}

function ShidoColumn({ side, athlete }: { side: Side; athlete: SideState }) {
  return (
    <div
      className={PALETTE[side].className}
      style={{ width: '20%', height: '100%', backgroundColor: PALETTE[side].bg }}
    >
      <div className="shido-box">
        <div className="shido">
          {athlete.shido === 1 && <div className="shido-card">&nbsp;&nbsp;&nbsp;</div>}
          {athlete.shido === 2 && (
            <>
              <div className="shido-card shido-card-1">&nbsp;&nbsp;&nbsp;</div>
              <div className="shido-card shido-card-2">&nbsp;&nbsp;&nbsp;</div>
            </>
          )}
          {athlete.shido >= 3 && <div className="shido-card-red">&nbsp;&nbsp;&nbsp;</div>}
        </div>
        {athlete.shido > 0 && <div className="shido-label">Shido</div>}
      </div>
    </div>
  );
}

function Stripe({ left, right, height }: { left: string; right: string; height: string }) {
  return (
    <div style={{ height }}>
      <div className="d-flex" style={{ height: '100%' }}>
        <div className="flex-grow-1" style={{ backgroundColor: left }} />
        <div className="flex-grow-1" style={{ backgroundColor: right }} />
      </div>
    </div>
  );
}

export function Scoreboard({ state, now }: { state: MatchState; now: number }) {
  // Fixed, and deliberately not state.swapSides: that flag mirrors the
  // operator's panel to match the corners as they face the table. The hall's
  // board is built white-on-the-left, and an audience that has spent a
  // tournament learning to read it must not have the corners swapped under
  // them because the operator changed seats.
  const left: Side = 'white';
  const right: Side = 'blue';
  const held = state.osaekomi.side;
  const osaekomiText = held ? formatOsaekomi(osaekomiElapsed(state.osaekomi, now)) : '00';

  return (
    <div className="main d-flex flex-column">
      <Stripe left={PALETTE[left].bg} right={PALETTE[right].bg} height="5%" />

      {/* category and names */}
      <div style={{ height: '25%' }}>
        <div className="d-flex" style={{ height: '100%' }}>
          <div style={{ width: '8%', backgroundColor: PALETTE[left].bg }} />
          <div className="flex-fill">
            <div className="d-flex flex-column" style={{ height: '100%' }}>
              <div style={{ backgroundColor: '#002c5a', height: '32%', textAlign: 'center' }}>
                <span style={{ color: 'white', fontSize: '3vw', fontWeight: 'bold' }}>
                  {state.category}
                </span>
              </div>
              <div style={{ backgroundColor: '#ff007d', height: '4%' }} />
              <div style={{ backgroundColor: '#ffffff', height: '64%' }}>
                <div className="d-flex" style={{ height: '100%' }}>
                  <div style={{ width: '44%' }}>
                    <div className="centre-box">
                      <span style={{ fontSize: '4vw', fontWeight: 'bold', color: '#002c5a' }}>
                        {state[left].name}
                      </span>
                    </div>
                  </div>
                  <div style={{ width: '12%', height: '100%', padding: 5 }}>
                    <div className="centre-box">
                      <img
                        src={state.logoDataUrl ?? ijfLogoUrl}
                        alt=""
                        style={{ maxWidth: '100%', maxHeight: '100%' }}
                      />
                    </div>
                  </div>
                  <div className="flex-grow-1">
                    <div className="centre-box">
                      <span style={{ fontSize: '4vw', fontWeight: 'bold', color: '#002c5a' }}>
                        {state[right].name}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ width: '8%', backgroundColor: PALETTE[right].bg }} />
        </div>
      </div>

      <Stripe left={PALETTE[left].bg} right={PALETTE[right].bg} height="2%" />

      {/* shido, clock, shido */}
      <div>
        <div className="d-flex" style={{ height: '100%' }}>
          <ShidoColumn side={left} athlete={state[left]} />
          <div className="flex-fill" style={{ backgroundColor: 'black', height: '100%' }}>
            <div id="timer" style={{ height: '100%' }}>
              <span className={state.goldenScore ? 'gs' : undefined}>
                <FixedDigits text={clockText(state, now)} />
              </span>
            </div>
          </div>
          <ShidoColumn side={right} athlete={state[right]} />
        </div>
      </div>

      {/* scores and osaekomi */}
      <div className="flex-grow-1">
        <div className="d-flex" style={{ height: '100%' }}>
          <ScoreColumn side={left} athlete={state[left]} />
          <div style={{ backgroundColor: '#002c5a', height: '100%', width: '28%' }}>
            <div id="osaekomi-timer" style={{ height: '100%', color: '#ffffff' }}>
              <div>
                <span
                  style={{ display: 'inline-block', width: '0.6em', textAlign: 'center' }}
                  className={held === left ? undefined : 'color-dark'}
                >
                  &lsaquo;
                </span>
                <span
                  style={{ display: 'inline-block' }}
                  className={held ? undefined : 'color-dark'}
                >
                  <FixedDigits text={osaekomiText} />
                </span>
                <span
                  style={{ display: 'inline-block', width: '0.6em', textAlign: 'center' }}
                  className={held === right ? undefined : 'color-dark'}
                >
                  &rsaquo;
                </span>
              </div>
              {held && <div className="osaekomi-label">Osaekomi</div>}
            </div>
          </div>
          <ScoreColumn side={right} athlete={state[right]} />
        </div>
      </div>

      <Stripe left={PALETTE[left].bg} right={PALETTE[right].bg} height="5%" />
    </div>
  );
}
