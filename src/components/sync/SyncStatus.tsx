import { useSync } from '@/lib/useSync';
import { flush } from '@/lib/sync';

const TEXT = {
  local: 'Saved on this device. Sign in to keep it on your account.',
  saved: 'All changes saved.',
  pending: 'Saving soon…',
  syncing: 'Saving…',
  offline: 'Offline. Your changes are kept here and will save when you are back online.',
  error: 'Could not save to your account. Your changes are kept on this device.',
} as const;

/** One line telling the reader where their changes are. */
export default function SyncStatus() {
  const s = useSync();
  return (
    <p className="hint" role="status" aria-live="polite">
      {TEXT[s.status]}
      {!s.storage && ' This browser is not keeping data on the device, so changes are sent straight away.'}
      {(s.status === 'error' || s.status === 'offline') && s.signedIn && <> <button type="button" className="linkish" onClick={() => flush()}>Try again</button></>}
    </p>
  );
}
