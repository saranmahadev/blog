# Launch and housekeeping checklist

Things only the owner can do, outside the repository. Tick them off once.

## Search
1. **Google Search Console.** Add `https://blog.saranmahadev.in` as a domain property (a DNS TXT record), then submit `https://blog.saranmahadev.in/sitemap.xml`. Check Pages and Core Web Vitals after a week.
2. **Bing Webmaster Tools.** Import the site from Search Console and submit the sitemap. This also covers DuckDuckGo and others that use Bing.
3. **Share previews.** Paste an article URL into the LinkedIn Post Inspector, the Facebook Sharing Debugger and an X post draft to check the image and title. Add the site URL to your GitHub, YouTube, Instagram and LinkedIn profiles.
4. **Rich results.** Run one article through Google's Rich Results Test; it should show Article and Breadcrumb.

## Account and cloud security
5. **Firebase web API key.** Google Cloud Console > APIs and Services > Credentials: restrict the key to HTTP referrers `blog.saranmahadev.in/*` (and the preview domain if you use one), and to the Identity Toolkit and Firestore APIs.
6. **Budget alert.** Billing > Budgets and alerts: a small monthly budget with email alerts at 50%, 90% and 100%.
7. **Two-step verification** with a passkey on `mail@saranmahadev.in`; set recovery email and phone. This mailbox decides who is the author.
8. **Authorised domains.** Firebase Authentication > Settings: keep only your own domains.
9. **GitHub.** Settings > Code security: enable secret scanning and push protection, Dependabot alerts. Settings > Branches: protect `main` and require the `ci-ok` check.

## Email and domain
10. **SPF, DKIM, DMARC** on `saranmahadev.in`, so mail from your address cannot be spoofed and reaches inboxes. Confirm `mail@saranmahadev.in` receives mail.
11. **DNS and HTTPS.** HTTPS enforced, a CAA record, and HSTS preload (hstspreload.org) once you are sure every subdomain serves HTTPS.
12. **Domain.** Turn on auto-renew and the registrar lock.

## Data and legal
13. **Backups.** Schedule a Firestore export (Cloud Scheduler plus a bucket) or accept that messages are not backed up. Test "Delete my account" once end to end.
14. **Lawyer.** Have the Terms and Privacy pages read once. Ask a CA about GST thresholds and update the terms the day you register.
15. **Screen reader.** One pass with NVDA (Windows) or VoiceOver (Mac/iOS) on sign-in, inbox and an article.
