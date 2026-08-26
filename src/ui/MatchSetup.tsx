import { useState } from 'react';
import type { Action } from '../engine/matchEngine';
import type { MatchState } from '../engine/matchState';
import { DEFAULT_DURATION_MS } from '../engine/rules';

export function MatchSetup({
  state,
  dispatch,
}: {
  state: MatchState;
  dispatch: (action: Action) => void;
}) {
  const [white, setWhite] = useState('');
  const [blue, setBlue] = useState('');
  const [category, setCategory] = useState(state.category);
  const [minutes, setMinutes] = useState(String(state.durationMs / 60_000));
  const [swapSides, setSwapSides] = useState(state.swapSides);

  const parsedMinutes = Number(minutes);
  const valid =
    white.trim().length > 0 &&
    blue.trim().length > 0 &&
    Number.isFinite(parsedMinutes) &&
    parsedMinutes > 0;

  return (
    <form
      style={{ maxWidth: 480, margin: '3rem auto', display: 'grid', gap: '1rem' }}
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        dispatch({
          type: 'SETUP_MATCH',
          white: white.trim(),
          blue: blue.trim(),
          category: category.trim(),
          durationMs: Math.round(parsedMinutes * 60_000) || DEFAULT_DURATION_MS,
          swapSides,
          logoDataUrl: state.logoDataUrl,
        });
      }}
    >
      <h2 style={{ color: '#002c5a' }}>Next contest</h2>

      <label>
        White
        <input value={white} onChange={(e) => setWhite(e.target.value)} autoFocus />
      </label>
      <label>
        Blue
        <input value={blue} onChange={(e) => setBlue(e.target.value)} />
      </label>
      <label>
        Category
        <input value={category} onChange={(e) => setCategory(e.target.value)} />
      </label>
      <label>
        Duration (minutes)
        <input
          type="number"
          min="0.5"
          step="0.5"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={swapSides}
          onChange={(e) => setSwapSides(e.target.checked)}
        />
        White on the right
      </label>

      <button type="submit" disabled={!valid}>Start</button>
    </form>
  );
}
