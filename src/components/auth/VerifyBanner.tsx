import { useAuth, useVerifyEmail } from '@/lib/auth';
import { firebaseConfigured } from '@/lib/firebase';

/** Shown at the top of every page to a signed-in reader whose email is not verified yet. */
export default function VerifyBanner() {
  const { status, user } = useAuth();
  const v = useVerifyEmail(user);
  if (!firebaseConfigured || status !== 'in' || !user || user.emailVerified) return null;
  const busy = v.state === 'sending' || v.state === 'checking';

  return (
    <div id="verify-banner" className="vbar" role="region" aria-label="Verify your email">
      <div className="wrap vbar-in">
        <p className="vbar-t">
          <strong>Verify your email to comment.</strong>{' '}
          <span role="status" aria-live="polite">{v.state === 'idle' ? `Your address is ${user.email}.` : v.message}</span>
          {v.error && <span className="err" role="alert" style={{ marginLeft: 8 }}>{v.error}</span>}
        </p>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          {v.state === 'idle' || v.state === 'sending' ? (
            <button className="btn sm ink" type="button" onClick={v.send} disabled={busy}>{v.state === 'sending' ? 'Sending…' : 'Send verification email'}</button>
          ) : (
            <>
              <button className="btn sm ink" type="button" onClick={v.check} disabled={busy}>{v.state === 'checking' ? 'Checking…' : 'I have verified'}</button>
              <button className="btn sm ghost" type="button" onClick={v.send} disabled={busy || v.waitSeconds > 0}>{v.waitSeconds > 0 ? `Resend in ${v.waitSeconds}s` : 'Resend email'}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
