import type { Action } from '../engine/matchEngine';
import type { MatchState, ScoreType, Side, WinReason } from '../engine/matchState';
import { clockText } from './useNow';

const SCORES: Array<{ scoreType: ScoreType; label: string }> = [
  { scoreType: 'ippon', label: 'Ippon' },
  { scoreType: 'wazaari', label: 'Waza-ari' },
  { scoreType: 'yuko', label: 'Yuko' },
];

const REASON_TEXT: Record<WinReason, string> = {
  ippon: 'Ippon',
  'waza-ari-awasete-ippon': 'Waza-ari-awasete-ippon',
  'waza-ari': 'Waza-ari',
  yuko: 'Yuko',
  'hansoku-make': 'Hansoku-make',
};

const SIDE_STYLE: Record<Side, React.CSSProperties> = {
  white: { background: '#f0efed', color: '#002c5a' },
  blue: { background: '#005d99', color: '#ffffff' },
};

function SideControls({
  side,
  state,
  dispatch,
}: {
  side: Side;
  state: MatchState;
  dispatch: (action: Action) => void;
}) {
  const athlete = state[side];
  const canAdd = state.phase !== 'setup' && state.phase !== 'finished';
  const canCorrect = state.phase !== 'setup';
  const holding = state.osaekomi.side === side;
  const canHold = state.phase === 'fighting' && state.osaekomi.side === null;

  return (
    <section style={{ ...SIDE_STYLE[side], padding: '1rem', borderRadius: 8, flex: 1 }}>
      <h3 style={{ marginTop: 0 }}>{athlete.name || side}</h3>

      {SCORES.map(({ scoreType, label }) => (
        <div key={scoreType} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <button
            style={{ flex: 1 }}
            disabled={!canAdd}
            onClick={() => dispatch({ type: 'SCORE', side, scoreType })}
          >
            + {label}
          </button>
          <button
            disabled={!canCorrect}
            onClick={() => dispatch({ type: 'UNSCORE', side, scoreType })}
          >
            −
          </button>
        </div>
      ))}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <button
          style={{ flex: 1 }}
          disabled={!canAdd}
          onClick={() => dispatch({ type: 'SHIDO', side })}
        >
          + Shido ({athlete.shido})
        </button>
        <button disabled={!canCorrect} onClick={() => dispatch({ type: 'UNSHIDO', side })}>
          −
        </button>
      </div>

      {holding ? (
        <button style={{ width: '100%' }} onClick={() => dispatch({ type: 'TOKETA' })}>
          Toketa
        </button>
      ) : (
        <button
          style={{ width: '100%' }}
          disabled={!canHold}
          onClick={() => dispatch({ type: 'OSAEKOMI_START', side })}
        >
          Osaekomi
        </button>
      )}
    </section>
  );
}

export function ControlPanel({
  state,
  dispatch,
  now,
}: {
  state: MatchState;
  dispatch: (action: Action) => void;
  now: number;
}) {
  const winnerName = state.winner ? state[state.winner.side].name : null;

  return (
    <div style={{ padding: '1rem', display: 'grid', gap: '1rem' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ fontSize: '3rem', fontVariantNumeric: 'tabular-nums' }}>
          {clockText(state, now)}
        </div>
        <div>
          <div style={{ fontWeight: 'bold' }}>{state.category}</div>
          {state.goldenScore && <div style={{ color: '#b8860b' }}>Golden score</div>}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          {state.phase === 'fighting' ? (
            <button style={{ fontSize: '1.5rem' }} onClick={() => dispatch({ type: 'MATE' })}>
              Mate
            </button>
          ) : (
            <button
              style={{ fontSize: '1.5rem' }}
              disabled={state.phase !== 'ready' && state.phase !== 'paused'}
              onClick={() => dispatch({ type: 'HAJIME' })}
            >
              Hajime
            </button>
          )}
        </div>
      </header>

      {state.winner && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 8,
            background: '#002c5a',
            color: 'white',
            fontSize: '1.25rem',
          }}
        >
          Winner: {winnerName} — {REASON_TEXT[state.winner.reason]}
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem' }}>
        <SideControls side="white" state={state} dispatch={dispatch} />
        <SideControls side="blue" state={state} dispatch={dispatch} />
      </div>

      <footer style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={() => dispatch({ type: 'RESET_SCORES' })}>Reset scores</button>
        <button onClick={() => dispatch({ type: 'NEW_MATCH' })}>New match</button>
        <button style={{ marginLeft: 'auto' }} onClick={() => window.open('?role=scoreboard', '_blank')}>
          Open scoreboard in a new tab
        </button>
      </footer>
    </div>
  );
}
