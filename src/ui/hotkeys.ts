import type { Action } from '../engine/matchEngine';
import type { MatchState, ScoreType, Side } from '../engine/matchState';

export type Command =
  | { kind: 'toggle-clock' }
  | { kind: 'score'; side: Side; scoreType: ScoreType }
  | { kind: 'shido'; side: Side }
  | { kind: 'toggle-osaekomi'; side: Side };

/** Numbers stay bound to the colour, not to the side of the screen. */
const KEY_MAP: Record<string, Command> = {
  ' ': { kind: 'toggle-clock' },
  '1': { kind: 'score', side: 'white', scoreType: 'yuko' },
  '2': { kind: 'score', side: 'white', scoreType: 'wazaari' },
  '3': { kind: 'score', side: 'white', scoreType: 'ippon' },
  '4': { kind: 'shido', side: 'white' },
  '5': { kind: 'toggle-osaekomi', side: 'white' },
  '6': { kind: 'score', side: 'blue', scoreType: 'yuko' },
  '7': { kind: 'score', side: 'blue', scoreType: 'wazaari' },
  '8': { kind: 'score', side: 'blue', scoreType: 'ippon' },
  '9': { kind: 'shido', side: 'blue' },
  '0': { kind: 'toggle-osaekomi', side: 'blue' },
};

export function commandForKey(key: string): Command | null {
  return KEY_MAP[key] ?? null;
}

export function commandToAction(command: Command, state: MatchState): Action {
  switch (command.kind) {
    case 'toggle-clock':
      return state.phase === 'fighting' ? { type: 'MATE' } : { type: 'HAJIME' };
    case 'score':
      return { type: 'SCORE', side: command.side, scoreType: command.scoreType };
    case 'shido':
      return { type: 'SHIDO', side: command.side };
    case 'toggle-osaekomi':
      return state.osaekomi.side === command.side
        ? { type: 'TOKETA' }
        : { type: 'OSAEKOMI_START', side: command.side };
  }
}
