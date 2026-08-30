import { formatOsaekomi, osaekomiElapsed } from '../engine/clock';
import type { Action } from '../engine/matchEngine';
import type { MatchState, ScoreType, Side, SideState, WinReason } from '../engine/matchState';
import { hasIppon } from '../engine/matchState';
import { JudoMark } from './JudoMark';
import './panel.css';
import { clockText } from './useNow';

// The keys are the ones in hotkeys.ts, repeated here only as captions. They
// are bound to the colour rather than to the side of the screen, which is why
// each side carries its own fixed set.
const SCORES: Array<{ scoreType: ScoreType; label: string; keys: Record<Side, string> }> = [
  { scoreType: 'ippon', label: 'Ippon', keys: { white: '3', blue: '8' } },
  { scoreType: 'wazaari', label: 'Waza-ari', keys: { white: '2', blue: '7' } },
  { scoreType: 'yuko', label: 'Yuko', keys: { white: '1', blue: '6' } },
];

const SHIDO_KEY: Record<Side, string> = { white: '4', blue: '9' };
const HOLD_KEY: Record<Side, string> = { white: '5', blue: '0' };

const CORNER_LABEL: Record<Side, string> = { white: 'White', blue: 'Blue' };

function scoreCount(athlete: SideState, scoreType: ScoreType): number {
  switch (scoreType) {
    case 'ippon':
      return hasIppon(athlete) ? 1 : 0;
    case 'wazaari':
      return athlete.wazaari;
    case 'yuko':
      return athlete.yuko;
  }
}

const REASON_TEXT: Record<WinReason, string> = {
  ippon: 'Ippon',
  'waza-ari-awasete-ippon': 'Waza-ari-awasete-ippon',
  'waza-ari': 'Waza-ari',
  yuko: 'Yuko',
  'hansoku-make': 'Hansoku-make',
};

const PHASE_TEXT: Record<MatchState['phase'], string> = {
  setup: 'Setup',
  ready: 'Ready',
  fighting: 'Fighting',
  paused: 'Mate',
  finished: 'Finished',
};

function Score({
  label,
  hotkey,
  count,
  danger = false,
  canAdd,
  canSubtract,
  onAdd,
  onSubtract,
}: {
  label: string;
  hotkey: string;
  count: number;
  danger?: boolean;
  canAdd: boolean;
  canSubtract: boolean;
  onAdd: () => void;
  onSubtract: () => void;
}) {
  return (
    <div className={`score${danger ? ' score--shido' : ''}`}>
      <span className="score__label">{label}</span>
      <div className="score__row">
        <button
          type="button"
          className="step"
          disabled={!canSubtract}
          aria-label={`Remove ${label}`}
          onClick={onSubtract}
        >
          −
        </button>
        <span className="score__value">{count}</span>
        <button
          type="button"
          className="step"
          disabled={!canAdd}
          aria-label={`Add ${label}`}
          onClick={onAdd}
        >
          +
        </button>
      </div>
      <span className="score__key">{hotkey}</span>
    </div>
  );
}

function Mat({
  side,
  state,
  dispatch,
  now,
}: {
  side: Side;
  state: MatchState;
  dispatch: (action: Action) => void;
  now: number;
}) {
  const athlete = state[side];
  const canAdd = state.phase !== 'setup' && state.phase !== 'finished';
  const canCorrect = state.phase !== 'setup';
  const holding = state.osaekomi.side === side;
  const canHold = state.phase === 'fighting' && state.osaekomi.side === null;

  return (
    <section className={`mat mat--${side}${holding ? ' mat--holding' : ''}`}>
      <header className="mat__head">
        <h2 className="mat__name">{athlete.name || CORNER_LABEL[side]}</h2>
        <span className="mat__corner">{CORNER_LABEL[side]}</span>
      </header>

      <div className="mat__scores">
        {SCORES.map(({ scoreType, label, keys }) => (
          <Score
            key={scoreType}
            label={label}
            hotkey={keys[side]}
            count={scoreCount(athlete, scoreType)}
            canAdd={canAdd}
            canSubtract={canCorrect}
            onAdd={() => dispatch({ type: 'SCORE', side, scoreType })}
            onSubtract={() => dispatch({ type: 'UNSCORE', side, scoreType })}
          />
        ))}
        <Score
          label="Shido"
          hotkey={SHIDO_KEY[side]}
          count={athlete.shido}
          danger
          canAdd={canAdd}
          canSubtract={canCorrect}
          onAdd={() => dispatch({ type: 'SHIDO', side })}
          onSubtract={() => dispatch({ type: 'UNSHIDO', side })}
        />
      </div>

      {holding ? (
        <button type="button" className="hold hold--on" onClick={() => dispatch({ type: 'TOKETA' })}>
          Toketa
          <span className="hold__count">{formatOsaekomi(osaekomiElapsed(state.osaekomi, now))}</span>
          <span className="score__key">{HOLD_KEY[side]}</span>
        </button>
      ) : (
        <button
          type="button"
          className="hold"
          disabled={!canHold}
          onClick={() => dispatch({ type: 'OSAEKOMI_START', side })}
        >
          Osaekomi
          <span className="score__key">{HOLD_KEY[side]}</span>
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
  const fighting = state.phase === 'fighting';

  // Which corner sits on which side of this panel. The hotkeys stay bound to
  // the colour rather than to the column (see hotkeys.ts), so the captions
  // travel with the card and keep telling the truth after a swap.
  const left: Side = state.swapSides ? 'blue' : 'white';
  const right: Side = state.swapSides ? 'white' : 'blue';

  return (
    <div className="panel">
      <header className="panel__bar">
        <JudoMark className="panel__mark" />
        <div className="panel__bout">
          {state.category && <span className="panel__category">{state.category}</span>}
          {state.goldenScore ? (
            <span className="panel__gs">Golden score</span>
          ) : (
            <span className="panel__phase">{PHASE_TEXT[state.phase]}</span>
          )}
        </div>

        <div className={`panel__clock${state.goldenScore ? ' panel__clock--gs' : ''}`}>
          {clockText(state, now)}
        </div>

        {fighting ? (
          <button
            type="button"
            className="panel__transport panel__transport--stop"
            onClick={() => dispatch({ type: 'MATE' })}
          >
            Mate
          </button>
        ) : (
          <button
            type="button"
            className="panel__transport panel__transport--go"
            disabled={state.phase !== 'ready' && state.phase !== 'paused'}
            onClick={() => dispatch({ type: 'HAJIME' })}
          >
            Hajime
          </button>
        )}
      </header>

      {state.winner && (
        <div className="winner">
          <span className="winner__eyebrow">Winner</span>
          <span className="winner__name">{winnerName}</span>
          <span className="winner__reason">{REASON_TEXT[state.winner.reason]}</span>
        </div>
      )}

      <div className="panel__mats">
        <Mat side={left} state={state} dispatch={dispatch} now={now} />
        <Mat side={right} state={state} dispatch={dispatch} now={now} />
      </div>

      <footer className="panel__foot">
        <button type="button" onClick={() => dispatch({ type: 'RESET_SCORES' })}>
          Reset scores
        </button>
        <button type="button" onClick={() => dispatch({ type: 'NEW_MATCH' })}>
          New match
        </button>
        <a className="panel__foot-end" href="?role=scoreboard" target="_blank" rel="noreferrer">
          Open scoreboard in a new tab
        </a>
      </footer>
    </div>
  );
}
