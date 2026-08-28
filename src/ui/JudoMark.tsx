/**
 * The app's emblem: a gold ring around a diamond split down the middle into
 * the two judogi colours the whole product is built around — the same
 * #f0efed and #005d99 the control panel gives each side.
 */
export function JudoMark({ className = 'entry__mark' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" role="img" aria-label="Judo Scoreboard">
      <circle cx="32" cy="32" r="29.5" fill="none" stroke="#f2c14e" strokeWidth="1.5" />
      <path d="M32 11 L53 32 L32 53 L11 32 Z" fill="#f0efed" />
      <path d="M32 11 L53 32 L32 53 Z" fill="#005d99" />
      <path d="M32 11 L32 53" stroke="#f2c14e" strokeWidth="1.25" />
    </svg>
  );
}
