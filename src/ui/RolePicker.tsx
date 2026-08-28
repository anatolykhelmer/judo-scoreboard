import './entry.css';
import { JudoMark } from './JudoMark';

function PanelIcon() {
  return (
    <svg
      className="role-card__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M7 9h4M7 13h4M7 17h2" />
      <circle cx="16.5" cy="10" r="2.5" />
      <path d="M16.5 14v3" />
    </svg>
  );
}

function DisplayIcon() {
  return (
    <svg
      className="role-card__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M9 21h6M12 17v4" />
      <path d="M7 10.5h3M14 10.5h3" />
    </svg>
  );
}

export function RolePicker() {
  return (
    <div className="entry entry--picker">
      <div className="entry__inner">
        <header className="entry__head">
          <JudoMark />
          <p className="entry__eyebrow">Tatami control</p>
          <h1 className="entry__title">Judo Scoreboard</h1>
          <hr className="entry__rule" />
          <p className="entry__lede">
            Pick what this tab should be. One device runs the contest, the other
            shows it to the hall.
          </p>
        </header>

        <nav className="role-grid">
          <a className="role-card" href="?role=panel">
            <PanelIcon />
            <span className="role-card__title">Control panel</span>
            <span className="role-card__text">
              Clock, scores, penalties and osaekomi — plus the keyboard
              shortcuts for running a contest at speed.
            </span>
            <span className="role-card__cue">
              Open here <span aria-hidden="true">&rarr;</span>
            </span>
          </a>

          <a className="role-card" href="?role=scoreboard">
            <DisplayIcon />
            <span className="role-card__title">Scoreboard</span>
            <span className="role-card__text">
              The full-screen display that follows the panel live. Nothing to
              operate, nothing to click by accident.
            </span>
            <span className="role-card__cue">
              Open here <span aria-hidden="true">&rarr;</span>
            </span>
          </a>
        </nav>

        <p className="entry__foot">
          Open the control panel here and the scoreboard in a second tab, then
          drag that tab to the display facing the hall.
        </p>
      </div>
    </div>
  );
}
