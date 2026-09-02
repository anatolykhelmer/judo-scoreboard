import type { BoardProps } from './themes';
import { themeFor } from './themes';

/**
 * The only thing that knows a theme exists. ScoreboardRoot renders this and
 * stays about wiring — the store, the channel, the fullscreen prompt.
 */
export function ScoreboardView({ state, now }: BoardProps) {
  const { Board } = themeFor(state.theme);
  return <Board state={state} now={now} />;
}
