# Compliance notes

Practical notes for the owner, not legal advice. Have a lawyer review before relying on them.

| Area | Status | Where |
| --- | --- | --- |
| Age (COPPA, GDPR-K, India DPDP) | Sign-up requires ticking "I am 18 or older". The gate is client-side; deleting a minor's account on request is in the privacy policy. | `AuthForm.tsx`, `/privacy/#children`, `/terms/#accounts` |
| Fonts (GDPR) | Self-hosted with `@fontsource`; CSP `font-src 'self'`. `pnpm check:privacy` fails the build if Google Fonts or a tracker host appears in `dist/`. | `scripts/check-privacy.mjs` |
| Session replay / keystroke capture (CIPA) | None used. Adding any such tool needs consent, input masking and a privacy-policy update first. | `/privacy/#third-parties` |
| Marketing email (CAN-SPAM) | None sent. Account emails (verification, reset) are transactional. See below before starting a newsletter. | - |
| Subscription renewal (California ARL) | Nothing renews. Ad bookings are one-time, fixed term, paid in advance, and say so beside the booking buttons. | `AdBuilder.tsx`, `/terms/#advertising` |
| DMCA | Takedown process published at `/terms/#copyright`. Registering a designated agent is a manual step (below). | `/terms/#copyright` |

## Before sending any marketing email (for example "Dev Universe Weekly")

Every message must have:

1. A working one-click unsubscribe link (and the `List-Unsubscribe` and `List-Unsubscribe-Post` headers). Honour opt-outs within 10 business days, and never charge for it.
2. A valid physical postal address in the footer: a street address, or a PO box or commercial mailbox you have registered. Do not use your home address if you want privacy.
3. Accurate From, Reply-To and subject lines, and a clear statement that it is an advertisement if it is one.
4. Consent you can prove. For EU/UK readers use double opt-in; keep the date and source of each sign-up.

Footer template:

```
You are receiving this because you subscribed at blog.saranmahadev.in.
Unsubscribe: {{unsubscribe_url}}
Saran Mahadev, {{postal_address}}
```

## Registering a DMCA designated agent

Safe harbour under 17 U.S.C. 512(c) requires a registered agent. The risk is low here (no user uploads apart from advertiser banners), but registering costs little.

1. Go to <https://dmca.copyright.gov/> and create an account.
2. Choose "Register a new service provider". Enter the service name and the site `blog.saranmahadev.in`, plus alternate names (`blog-saranmahadev.web.app`, `Drafted`).
3. Enter the agent: your name, a mailing address (a PO box or commercial mailbox is accepted and keeps your home private), phone and `mail@saranmahadev.in`.
4. Pay the fee (USD 6) and submit.
5. Renew every 3 years; the registration expires otherwise. Add a calendar reminder.
6. Make sure the same contact appears at `/terms/#copyright`.
