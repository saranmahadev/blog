// Gives an account a role claim. Run once for yourself in Cloud Shell:
//   cd functions && npm ci && node scripts/set-role.mjs you@example.com admin
// Roles: user, author, moderator, admin. "admin" is the blog author: the only one who can reply to comments.
// The account must sign out and back in for the new role to take effect.
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const [email, role = 'admin'] = process.argv.slice(2);
if (!email || !['user', 'author', 'moderator', 'admin'].includes(role)) {
  console.error('Usage: node scripts/set-role.mjs <email> [user|author|moderator|admin]');
  process.exit(1);
}
initializeApp({ projectId: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'stride-11129' });
const user = await getAuth().getUserByEmail(email);
await getAuth().setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), role });
await getFirestore().doc(`users/${user.uid}`).set({ role }, { merge: true });
console.log(`${email} (${user.uid}) is now "${role}". Sign out and back in to pick it up.`);
