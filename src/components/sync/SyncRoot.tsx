import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { attach } from '@/lib/sync';

/** Connects the local-first store to whoever is signed in (or to nobody). Renders nothing. */
export default function SyncRoot() {
  const { status, user } = useAuth();
  useEffect(() => {
    if (status === 'loading') return;
    attach(status === 'in' && user ? user : null);
  }, [status, user]);
  return null;
}
