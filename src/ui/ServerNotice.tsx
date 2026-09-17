import { useState } from 'react';
import type { ClaimErr, ResultErr } from '../server/client';
import './entry.css';
import { JudoMark } from './JudoMark';

/**
 * Every screen the optional tournament server puts in front of the
 * operator, in the same card the resume prompt already uses. They are all
 * one-decision pages — confirm a host, type a PIN, retry or walk away — so
 * they borrow the entry screens' vocabulary rather than the panel's.
 *
 * The component only renders. Every decision about what happens next
 * belongs to PanelRoot, which is the one place that talks to the server.
 */

const EYEBROW = 'Tournament';

const CLAIM_TITLE: Record<ClaimErr['error'], string> = {
  pin_required: 'PIN required',
  pin_invalid: 'PIN required',
  claimed: 'Another table already has this contest',
  not_found: 'This contest is unknown',
  expired: 'This contest has expired',
  network: 'The contest could not be loaded',
  invalid_payload: 'That contest could not be read',
};

const CLAIM_LEDE: Record<ClaimErr['error'], string> = {
  pin_required: '',
  pin_invalid: '',
  claimed: 'The tournament office can release it. The panel can still run a contest without a server.',
  not_found: 'The link may be for another day. The panel can still run a contest without a server.',
  expired: 'Ask the tournament office for a new link. The panel can still run a contest without a server.',
  network: 'The server did not answer. The panel can still run a contest without a server.',
  invalid_payload: 'The server sent something this panel does not understand.',
};

const RESULT_TITLE: Record<ResultErr['error'], string> = {
  claimed: 'Another table owns this contest',
  not_found: 'This contest is unknown',
  expired: 'This contest has expired',
  forbidden: 'This table has not claimed this contest',
  network: 'The result was not sent',
  invalid_next: 'The answer could not be read',
};

/**
 * Only a failure the server may yet answer differently is worth a Retry.
 *
 * A 409, a 404 or a 410 will say the same thing however many times it is
 * asked: the contest belongs to another table, or does not exist, or has
 * expired. Offering a button that cannot work invites the operator to
 * stand there pressing it while a mat waits — the honest answer is that
 * this one needs the tournament office, and the only button is the one
 * that gets the contest running without them.
 */
const CLAIM_RETRYABLE: ReadonlySet<ClaimErr['error']> = new Set(['network', 'invalid_payload']);
const RESULT_RETRYABLE: ReadonlySet<ResultErr['error']> = new Set(['network', 'invalid_next']);

function retryable(error: ResultErr['error'] | ClaimErr['error']): boolean {
  return (
    RESULT_RETRYABLE.has(error as ResultErr['error']) ||
    CLAIM_RETRYABLE.has(error as ClaimErr['error'])
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="entry entry--notice">
      <div className="entry__inner">
        <div className="card notice">
          <JudoMark />
          {children}
        </div>
      </div>
    </div>
  );
}

/** The link named a server but did not name a usable contest on it. */
export function LinkNotice({ kind, onContinue }: {
  kind: 'incomplete' | 'invalid';
  onContinue: () => void;
}) {
  return (
    <Card>
      <p className="entry__eyebrow">{EYEBROW}</p>
      <h1 className="entry__title">
        {kind === 'incomplete' ? 'This link is incomplete' : 'This link cannot be used'}
      </h1>
      <p className="entry__lede">The panel can still run a contest without a server.</p>
      <div className="notice__actions">
        <button type="button" className="btn btn--primary" onClick={onContinue}>
          Continue
        </button>
      </div>
    </Card>
  );
}

/**
 * The first network gate. Nothing has been fetched when this is on screen,
 * and nothing will be until the operator says yes: a real panel link with
 * a hostile `api` would otherwise send the table's report to whoever wrote
 * the link. The hostname comes from the parsed URL, not from the query
 * string as typed, so what is shown is what will actually be called.
 */
export function ConfirmHost({ host, onConfirm, onDecline }: {
  host: string;
  onConfirm: () => void;
  onDecline: () => void;
}) {
  return (
    <Card>
      <p className="entry__eyebrow">{EYEBROW}</p>
      <h1 className="entry__title">Load this contest?</h1>
      <p className="entry__lede">
        Load this contest from <strong>{host}</strong>. The result will be sent there.
      </p>
      <div className="notice__actions">
        <button type="button" className="btn btn--primary" onClick={onConfirm}>
          Load contest
        </button>
        <button type="button" className="btn btn--ghost" onClick={onDecline}>
          Continue without server
        </button>
      </div>
    </Card>
  );
}

/** Waiting on a request. No button that would start a second one. */
export function ServerBusy({ title }: { title: string }) {
  return (
    <Card>
      <p className="entry__eyebrow">{EYEBROW}</p>
      <h1 className="entry__title">{title}</h1>
    </Card>
  );
}

/**
 * The PIN the marshal reads out, for a link that was copied before the
 * table sat down. It is never in the URL, never stored, and never logged —
 * it exists only in this field and in the body of the claim that follows.
 *
 * Rendered only when the server has said it wants one: a panel that asked
 * every time would train operators to type it into anything.
 */
export function PinPrompt({ host, invalid, onSubmit, onDecline }: {
  host: string;
  invalid: boolean;
  onSubmit: (pin: string) => void;
  onDecline: () => void;
}) {
  const [pin, setPin] = useState('');
  return (
    <Card>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (pin.trim() === '') return;
          onSubmit(pin);
        }}
      >
        <p className="entry__eyebrow">{EYEBROW}</p>
        <h1 className="entry__title">PIN required</h1>
        <p className="entry__lede">
          <strong>{host}</strong> asks for the PIN for this contest.
        </p>
        <label className="field">
          <span className="field__label">PIN</span>
          <input
            type="password"
            value={pin}
            autoComplete="off"
            autoFocus
            onChange={(e) => setPin(e.target.value)}
          />
        </label>
        {invalid && <p className="form__error">That PIN was not accepted</p>}
        <div className="notice__actions">
          <button type="submit" className="btn btn--primary" disabled={pin.trim() === ''}>
            Continue
          </button>
          <button type="button" className="btn btn--ghost" onClick={onDecline}>
            Continue without server
          </button>
        </div>
      </form>
    </Card>
  );
}

/** A claim that failed. The operator can always walk away from it. */
export function ClaimError({ error, onRetry, onDecline }: {
  error: ClaimErr['error'];
  onRetry: () => void;
  onDecline: () => void;
}) {
  return (
    <Card>
      <p className="entry__eyebrow">{EYEBROW}</p>
      <h1 className="entry__title">{CLAIM_TITLE[error]}</h1>
      {CLAIM_LEDE[error] && <p className="entry__lede">{CLAIM_LEDE[error]}</p>}
      <div className="notice__actions">
        {CLAIM_RETRYABLE.has(error) && (
          <button type="button" className="btn btn--primary" onClick={onRetry}>
            Retry
          </button>
        )}
        <button type="button" className="btn btn--ghost" onClick={onDecline}>
          Continue without server
        </button>
      </div>
    </Card>
  );
}

/**
 * The contest is over and either the report or the next bout did not get
 * through. The contest itself is untouched behind this card — Retry sends
 * the same report again, which the server accepts without overwriting the
 * first one that landed.
 *
 * "Continue without server" here means: keep the finished contest, stop
 * talking to the server for the rest of the day. It does not throw the
 * result away, and it does not invent a second one.
 */
export function ResultError({ error, stage, onRetry, onDismiss }: {
  error: ResultErr['error'] | ClaimErr['error'];
  stage: 'result' | 'next';
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const title = error in RESULT_TITLE
    ? RESULT_TITLE[error as ResultErr['error']]
    : CLAIM_TITLE[error as ClaimErr['error']];
  const canRetry = retryable(error);
  return (
    <Card>
      <p className="entry__eyebrow">{EYEBROW}</p>
      <h1 className="entry__title">{title}</h1>
      <p className="entry__lede">
        {canRetry
          ? stage === 'result'
            ? 'The contest is still here. Nothing has been lost.'
            : 'The result was sent. Only the next contest is missing.'
          : stage === 'result'
            ? 'The contest is still here, but this table cannot file it. The tournament office has to sort it out.'
            : 'The result was sent. Only the next contest needs the tournament office.'}
      </p>
      <div className="notice__actions">
        {canRetry && (
          <button type="button" className="btn btn--primary" onClick={onRetry}>
            {stage === 'result' ? 'Retry' : 'Retry next contest'}
          </button>
        )}
        <button type="button" className="btn btn--ghost" onClick={onDismiss}>
          Continue without server
        </button>
      </div>
    </Card>
  );
}

/** The server has no further contest for this mat. */
export function QueueDone({ onDismiss }: { onDismiss: () => void }) {
  return (
    <Card>
      <p className="entry__eyebrow">{EYEBROW}</p>
      <h1 className="entry__title">No further contest</h1>
      <p className="entry__lede">
        The result was sent and this table has nothing else scheduled.
      </p>
      <div className="notice__actions">
        <button type="button" className="btn btn--primary" onClick={onDismiss}>
          Back to the contest
        </button>
      </div>
    </Card>
  );
}
