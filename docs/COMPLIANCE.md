# Compliance notes

Practical notes for the owner, not legal advice. This is an Indian site (.in, author in Bengaluru, data in Mumbai), so Indian law comes first. Have a lawyer review before relying on it.

## India

| Area | Law | Status | Where |
| --- | --- | --- | --- |
| Personal data | Digital Personal Data Protection Act, 2023 | Author is the Data Fiduciary. Consent by the sign-up tick box, rights (access, correction, erasure, nominee), breach notice, escalation to the Data Protection Board. Adults only (under 18 is a child and needs verifiable parental consent). Data stays in Mumbai. | `/privacy/` |
| Intermediary duties | IT Act 2000 s.79, IT (Intermediary Guidelines) Rules 2021 | Named Grievance Officer, acknowledge in 24 hours, resolve in 15 days. | `/terms/#grievance`, `/contact/#grievance` |
| Copyright | Copyright Act 1957 s.52(1)(c), Copyright Rules 2013 r.75 | Written-notice process, access withheld 21 days unless a court order follows. | `/terms/#copyright` |
| Advertising | ASCI code, Consumer Protection (E-Commerce) Rules 2020 | Ads labelled "Sponsored", no misleading claims, refunds stated. | `/advertise/`, `/terms/#advertising` |
| Tax | GST | Not registered, none charged, stated plainly. Registration is free; the cost is filing returns (often a CA's fee). Service providers are generally exempt below Rs 20 lakh turnover (Rs 10 lakh in some states). Confirm with a CA, especially for foreign-currency bookings, and update the terms the day you register. | `/terms/#advertising` |
| Governing law | Indian Contract Act 1872, IT Act 2000 | Bengaluru courts. | `/terms/#law` |
| Spam | IT Act, TRAI commercial-communication rules, DPDP consent | No marketing email is sent. See the checklist below. | - |

## If you serve readers elsewhere

| Area | Status |
| --- | --- |
| Age (COPPA, GDPR-K) | Covered by the 18+ tick box at sign-up (client-side self-declaration). |
| Fonts (GDPR) | Self-hosted with `@fontsource`; CSP `font-src 'self'`. `pnpm check:privacy` fails the build if Google Fonts or a tracker host appears in `dist/`. |
| Session replay (CIPA) | None used. Adding any such tool needs consent, input masking and a privacy-policy update first. |
| Renewal (California ARL) | Nothing renews; bookings are one-time, fixed term, paid in advance, and say so beside the booking buttons. |
| DMCA | Optional. Only matters for the US safe harbour. Notices in DMCA format are accepted at the same address. Registration steps are at the bottom. |

## Before sending any marketing email (for example "Dev Universe Weekly")

India: get clear opt-in consent for the newsletter separately from account creation (DPDP Act), record when and how, and honour withdrawal at once. Every message must also have:

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
