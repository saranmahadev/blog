import { useSyncExternalStore } from 'react';
import { getServerSnapshot, getSnapshot, subscribe } from './messages';

/** Cached messages plus the ones still waiting to be sent. */
export const useMessages = () => useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
