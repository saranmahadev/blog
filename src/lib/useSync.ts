import { useSyncExternalStore } from 'react';
import { getServerSnapshot, getSnapshot, subscribe } from './sync';

/** The reader's local-first state (bookmarks, progress, settings) and how well it is synced. */
export const useSync = () => useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
