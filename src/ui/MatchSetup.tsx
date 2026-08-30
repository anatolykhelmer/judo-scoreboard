import { useState } from 'react';
import type { Action } from '../engine/matchEngine';
import type { MatchState } from '../engine/matchState';
import { DEFAULT_DURATION_MS } from '../engine/rules';
import './entry.css';
import { JudoMark } from './JudoMark';

// The contest lengths an operator actually reaches for. They only write into
// the minutes field below, which stays the single source of truth — anything
// off this list is still typed in by hand.
const DURATION_PRESETS = [2, 3, 4, 5];

const MAX_LOGO_BYTES = 200_000;

function UploadIcon() {
  return (
    <svg
      className="drop__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 16V4" />
      <path d="M7.5 8.5 12 4l4.5 4.5" />
      <path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />
    </svg>
  );
}

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
  const [logoDataUrl, setLogoDataUrl] = useState(state.logoDataUrl);
  const [logoError, setLogoError] = useState<string | null>(null);

  const parsedMinutes = Number(minutes);
  const valid =
    white.trim().length > 0 &&
    blue.trim().length > 0 &&
    Number.isFinite(parsedMinutes) &&
    parsedMinutes > 0;

  return (
    <div className="entry entry--form">
      <div className="entry__inner">
        <form
          className="card form"
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
              logoDataUrl,
            });
          }}
        >
          <header className="card__head">
            <JudoMark className="card__mark" />
            <div>
              <p className="entry__eyebrow">Judo Scoreboard</p>
              <h1 className="entry__title">Next contest</h1>
            </div>
          </header>

          <div className="corners">
            <label className="field corner corner--white">
              <span className="field__label">White</span>
              <input
                type="text"
                value={white}
                placeholder="Athlete name"
                onChange={(e) => setWhite(e.target.value)}
                autoFocus
              />
            </label>
            <label className="field corner corner--blue">
              <span className="field__label">Blue</span>
              <input
                type="text"
                value={blue}
                placeholder="Athlete name"
                onChange={(e) => setBlue(e.target.value)}
              />
            </label>
          </div>

          <div className="form__row">
            <label className="field">
              <span className="field__label">Category</span>
              <input
                type="text"
                value={category}
                placeholder="e.g. U18 −66 kg"
                onChange={(e) => setCategory(e.target.value)}
              />
            </label>

            <div className="field">
              <label className="field">
                <span className="field__label">Duration (min)</span>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                />
              </label>
              <div className="chips">
                {DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="chip"
                    aria-pressed={parsedMinutes === preset}
                    onClick={() => setMinutes(String(preset))}
                  >
                    {preset} min
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="switch">
            <input
              type="checkbox"
              checked={swapSides}
              onChange={(e) => setSwapSides(e.target.checked)}
            />
            <span className="switch__track">
              <span className="switch__thumb" />
            </span>
            <span className="switch__text">
              White on the right
              <small>
                Orders this panel to match the corners as you see them. The hall&rsquo;s board
                is unaffected.
              </small>
            </span>
          </label>

          <div>
            <label className="drop">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setLogoError(null);
                  if (file.size > MAX_LOGO_BYTES) {
                    setLogoError('That file is too large — please use one under 200 KB.');
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => {
                    setLogoError(null);
                    setLogoDataUrl(typeof reader.result === 'string' ? reader.result : null);
                  };
                  reader.onerror = () => {
                    setLogoError('Could not read that file.');
                  };
                  reader.onabort = () => {
                    setLogoError('Could not read that file.');
                  };
                  reader.readAsDataURL(file);
                }}
              />
              <UploadIcon />
              <span className="drop__text">
                Venue logo
                <small>Optional &middot; any image up to 200 KB</small>
              </span>
            </label>

            {logoError && <p className="form__error">{logoError}</p>}

            {logoDataUrl && (
              <div className="logo-preview">
                <img src={logoDataUrl} alt="Venue logo preview" />
                <span>Logo ready — it will sit on the scoreboard.</span>
                <button
                  type="button"
                  className="btn btn--quiet"
                  onClick={() => setLogoDataUrl(null)}
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          <button type="submit" className="btn btn--primary" disabled={!valid}>
            Start contest
          </button>
        </form>
      </div>
    </div>
  );
}
