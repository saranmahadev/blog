import { useEffect } from 'react';
import { useAuth, useRole } from '@/lib/auth';
import { bindMessages } from '@/lib/messages';
import { attach } from '@/lib/sync';

/** Connects the local-first stores (reader state and messages) to whoever is signed in, or to nobody. Renders nothing. */
export default function SyncRoot() {
  const { status, user } = useAuth();
  const role = useRole(user);
  useEffect(() => {
    if (status === 'loading') return;
    attach(status === 'in' && user ? user : null);
    if (status === 'out') bindMessages(null, false);
  }, [status, user]);
  useEffect(() => {
    if (status === 'in' && user && role !== null) bindMessages(user, role === 'admin');
  }, [status, user, role]);
  return null;
}
