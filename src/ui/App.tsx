import { PanelRoot } from './PanelRoot';
import { RolePicker } from './RolePicker';
import { ScoreboardRoot } from './ScoreboardRoot';

export function App({ role }: { role: string | null }) {
  if (role === 'panel') return <PanelRoot />;
  if (role === 'scoreboard') return <ScoreboardRoot />;
  return <RolePicker />;
}
