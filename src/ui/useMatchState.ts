import { useSyncExternalStore } from 'react';
import type { MatchState } from '../engine/matchState';
import type { Store } from '../sync/store';

export function useMatchState(store: Store): MatchState {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
