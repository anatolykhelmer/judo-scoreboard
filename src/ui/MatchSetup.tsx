import { memo, useState } from 'react';
import type { Action } from '../engine/matchEngine';
import type { MatchState, ThemeId } from '../engine/matchState';
import { DEFAULT_DURATION_MS } from '../engine/rules';
import { COUNTRIES } from '../data/countries';
import { composeAthleteName } from './athleteName';
import { THEMES, themeFor } from './scoreboard/themes';
import './entry.css';
import { JudoMark } from './JudoMark';

// The contest lengths an operator actually reaches for. They only write into
// the minutes field below, which stays the single source of truth — anything
// off this list is still typed in by hand.
const DURATION_PRESETS = [2, 3, 4, 5];

// Written verbatim onto the board, so these are the IJF's own phase names.
const ROUND_PRESETS = ['ROUND OF 32', 'ROUND OF 16', 'QUARTER-FINAL', 'SEMI-FINAL', 'FINAL'];

const MAX_LOGO_BYTES = 200_000;

// COUNTRIES is a static import and never changes, so these two filters are
// hoisted to module scope rather than recomputed inside CountryField on
// every render — see the memo comment below for why that render count
// matters.
const NEUTRAL_COUNTRIES = COUNTRIES.filter((c) => c.iso === null);
const NATION_COUNTRIES = COUNTRIES.filter((c) => c.iso !== null);

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

// Memoized because MatchSetup holds five useState values, so every
// keystroke in the autofocused name field re-renders the whole form —
// including, without this, both 424-option selects. label is a string
// literal and onChange is a useState setter, so both props are stable
// across those re-renders and this component can skip them entirely.
const CountryField = memo(function CountryField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (code: string) => void;
}) {
  // The three IJF identities are not countries and belong in their own group
  // at the top — they are the default, and a club that never fills this in
  // should not have to scroll past 200 nations to find them.
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <optgroup label="No country">
          {NEUTRAL_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{`${c.name} (${c.code})`}</option>
          ))}
        </optgroup>
        <optgroup label="Countries">
          {NATION_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{`${c.name} (${c.code})`}</option>
          ))}
        </optgroup>
      </select>
    </label>
  );
});

export function MatchSetup({
  state,
  dispatch,
}: {
  state: MatchState;
  dispatch: (action: Action) => void;
}) {
  // Two fields per athlete rather than one. The board prints the surname
  // bold and the given name regular, and it tells them apart by the
  // surname's capitals — with a single free-text field an operator who typed
  // "Yoshihiro Nakamura" got no bold at all, because no word was capitalised
  // and the whole line fell to the given name. composeAthleteName joins the
  // halves and supplies the capitals, so how the operator types no longer
  // decides how the board reads.
  const [whiteSurname, setWhiteSurname] = useState('');
  const [whiteGiven, setWhiteGiven] = useState('');
  const [blueSurname, setBlueSurname] = useState('');
  const [blueGiven, setBlueGiven] = useState('');
  const [category, setCategory] = useState(state.category);
  const [minutes, setMinutes] = useState(String(state.durationMs / 60_000));
  const [swapSides, setSwapSides] = useState(state.swapSides);
  const [logoDataUrl, setLogoDataUrl] = useState(state.logoDataUrl);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [round, setRound] = useState(state.round);
  const [theme, setTheme] = useState<ThemeId>(state.theme);
  const [whiteCountry, setWhiteCountry] = useState(state.white.country);
  const [blueCountry, setBlueCountry] = useState(state.blue.country);

  const white = composeAthleteName(whiteSurname, whiteGiven);
  const blue = composeAthleteName(blueSurname, blueGiven);

  const parsedMinutes = Number(minutes);
  // Either half is enough to name an athlete, so the check is on the joined
  // line rather than on the surname field.
  const valid =
    white.length > 0 && blue.length > 0 && Number.isFinite(parsedMinutes) && parsedMinutes > 0;

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
              white,
              blue,
              category: category.trim(),
              durationMs: Math.round(parsedMinutes * 60_000) || DEFAULT_DURATION_MS,
              swapSides,
              // Only the modern board has a logo slot, so a file picked before
              // the operator switched away from it must not travel with the
              // contest.
              logoDataUrl: theme === 'modern' ? logoDataUrl : null,
              theme,
              round: round.trim(),
              whiteCountry,
              blueCountry,
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
            {/* A div, not a label: a label nested in a label binds to the wrong
                control and drags the whole subtree into its accessible name.
                Each control below carries its own label instead. */}
            <div className="field corner corner--white">
              <label className="field">
                <span className="field__label">White surname</span>
                {/* The placeholder is in capitals because that is how the
                    board prints it, whatever case is typed here. */}
                <input
                  type="text"
                  value={whiteSurname}
                  placeholder="NAKAMURA"
                  onChange={(e) => setWhiteSurname(e.target.value)}
                  autoFocus
                />
              </label>
              <label className="field">
                <span className="field__label">Given name</span>
                <input
                  type="text"
                  value={whiteGiven}
                  placeholder="Yoshihiro"
                  onChange={(e) => setWhiteGiven(e.target.value)}
                />
              </label>
              <CountryField label="Country" value={whiteCountry} onChange={setWhiteCountry} />
            </div>
            <div className="field corner corner--blue">
              <label className="field">
                <span className="field__label">Blue surname</span>
                <input
                  type="text"
                  value={blueSurname}
                  placeholder="MUKI"
                  onChange={(e) => setBlueSurname(e.target.value)}
                />
              </label>
              <label className="field">
                <span className="field__label">Given name</span>
                <input
                  type="text"
                  value={blueGiven}
                  placeholder="Sagi"
                  onChange={(e) => setBlueGiven(e.target.value)}
                />
              </label>
              <CountryField label="Country" value={blueCountry} onChange={setBlueCountry} />
            </div>
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

          <div className="form__row">
            <div className="field">
              <label className="field">
                <span className="field__label">Round</span>
                <input
                  type="text"
                  value={round}
                  placeholder="e.g. QUARTER-FINAL"
                  onChange={(e) => setRound(e.target.value)}
                />
              </label>
              <div className="chips">
                {ROUND_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="chip"
                    aria-pressed={round === preset}
                    onClick={() => setRound(preset)}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <span className="field__label" id="theme-label">Scoreboard theme</span>
              {/* One board or the other, never both: a radio group, not a row
                  of toggles. Each chip stays a button so it is reachable by
                  Tab like the rest of the form. */}
              <div className="chips" role="radiogroup" aria-labelledby="theme-label">
                {(Object.keys(THEMES) as ThemeId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    className="chip"
                    aria-checked={theme === id}
                    onClick={() => setTheme(id)}
                  >
                    {themeFor(id).label}
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

          {/* Only the modern board has a logo slot — the IJF venue board
              carries none, and the TV board follows it — so the control is
              shown only while that board is chosen rather than offered and
              then ignored. The picked file stays in the form's state, so
              switching away and back does not lose it. */}
          {theme === 'modern' && (
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
                  <small>Optional &middot; any image up to 200 KB &middot; the IJF logo otherwise</small>
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
          )}

          <button type="submit" className="btn btn--primary" disabled={!valid}>
            Start contest
          </button>
        </form>
      </div>
    </div>
  );
}
