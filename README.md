# RambleLon booking desk

A DJ site and inquiry app for RambleLon, built with Node.js 24+, Express, SQLite, and plain HTML/CSS/JavaScript.

## Local development

```sh
npm ci
npm start
```

The app listens on port 3000. The public site is `/`; the private dashboard is `/dashboard`.

**Local demo password:** `ramblelon-local-demo`. Set `ADMIN_PASSWORD` to override it. This fallback is for local development only. Production startup requires both `ADMIN_PASSWORD` and `SESSION_SECRET`. Set real credentials securely in environment settings, never in source control. The app does not load `.env` automatically; use your shell's environment or Node's `--env-file` option.

Requests and email previews persist in `.data/ramblelon.sqlite`, which is ignored by Git. Set `DATA_DIR` for a different database location and `PORT` for a different port. Local development sessions are held in memory. Production sessions are saved under DATA_DIR/sessions with an eight-hour expiry. On Render, secure cookies recognize its HTTPS reverse proxy.

## Current behavior

- Location controls venues. DC offers Private event, Bertha, Flash, Echostage, and Other. Other locations ask for city and allow a private event or custom venue.
- Changing location clears the prior venue. Server-side validation rejects mismatches.
- DC requests sort first in the private dashboard; local priority does not affect pricing.
- Standard base: $500. Wedding base: $15,000. Bringing gear: +$150.
- These are playful **demo pricing rules**, not a published pricing policy. Wedding humor and calculated recommendations are private to the dashboard.
- Set length is gathered for your review; it does not currently change the price.
- Requests without musical freedom are flagged for discussion.
- You can edit the quote and status. Saving never sends a quote or confirms a booking to the requester.
- No public confirmed-gig listings or quote-send action are implemented yet.

## Acknowledgment emails

Submitting an inquiry queues one acknowledgment. A background worker processes it, and the dashboard shows pending, preview, sent, or failed status. The message acknowledges receipt and explicitly does not promise availability, a booking, or a price.

**Default: preview mode.** Emails appear only in the authenticated dashboard inbox. Nothing is sent externally.

To send real email, configure these environment variables through your host's secure settings, then restart:

- `SMTP_HOST`: your mail provider's SMTP hostname
- `SMTP_PORT`: 587 (STARTTLS, default) or 465 (TLS)
- `SMTP_USER` and `SMTP_PASSWORD`: provider credentials, if required
- `MAIL_FROM`: a sender address verified with your provider

TLS verification stays enabled. SMTP availability depends on your host's networking; this cloud environment has not been validated for external SMTP. Do not enter secrets in chat. Preview messages are not sent retroactively when SMTP is enabled. Failed messages stay marked failed for investigation; there is no automatic retry UI yet. A crash between SMTP acceptance and saving delivery status can cause a duplicate acknowledgment on restart, so use a provider with idempotent delivery before production.

## Tests

```sh
npm test                  # pricing, validation, authenticated API, email queue
npm run test:browser      # independent Chromium smoke check; needs /usr/bin/chromium
npm run test:e2e          # Cypress suite against an isolated server/database
```

`test:e2e` creates a temporary database and starts a test-only server on port 3100; it deletes that database afterward. It never uses your live booking database or sends real email. The test port must be free. The Cypress suite covers venue dependencies, submissions, pricing combinations, quote overrides, DC priority, login protection, and mobile layout. `npm run cy:open` opens Cypress interactively against an already running local app.

On this cloud machine Cypress uses `.cache/Cypress` and a local Xvfb installation in `.tools/xvfb`. Install with:

```sh
sh scripts/setup-browser.sh
```

The cloud network must permit `download.cypress.io` and `cdn.cypress.io`. The Cypress npm package and its downloaded browser binary are separate; npm installation alone does not make Cypress runnable.

For the independent smoke check, set `CHROMIUM_PATH` if Chromium is installed elsewhere. Screenshots are written under `/tmp/ramblelon-*.png`.

## Files

- `public/`: website, booking form, dashboard, and browser scripts
- `server.js`: API, session authentication, persistence, acknowledgment worker
- `lib/booking.js`: validation and quote rules
- `cypress/e2e/`: Cypress demo journeys
- `tests/`: Node tests

The site retains your bio. Mix links and public gig listings remain placeholders. No deployment, custom domain, or live email provider has been configured.

## Cypress Cloud

Create a RambleLon project in your Cypress Cloud account. Its Project ID is under project Settings → General; its private Record Keys are under Settings → Record Keys. Configure `CYPRESS_PROJECT_ID` and `CYPRESS_RECORD_KEY` in your execution environment. The Project ID is public metadata; the Record Key must remain secret and must never be committed, passed on a command line, or pasted into chat.

```sh
npm run test:cloud
```

This command runs the suite on an isolated temporary database and records the results in the configured Cypress Cloud project. It requires HTTPS access to `api.cypress.io` in addition to the binary download domains. Local `npm run test:e2e` continues to work without a Cloud account or key and does not record results. The earlier local runs are not uploaded retroactively; recording creates a new run. The recording command prints the Cloud run URL after successful connection.

Cloud recording has been verified for project `njigat`. Test Replay uploads additionally require HTTPS access to `s3.amazonaws.com`; run results can record successfully even if replay upload is blocked.

## Hosted demo on Render

[Deploy to Render](https://render.com/deploy?repo=https://github.com/robbielon33/RambleLon-Site)

The repository's `render.yaml` supplies the build command, startup command, Node version, health check, and database storage. It selects a **paid Starter web service plus a 1 GB persistent disk**. Review the current price in Render before creating it. No paid hosting is provisioned merely by adding this file to GitHub.

1. Sign in to Render with GitHub and allow access to this repository.
2. Open the deploy link above. If prompted, choose the Blueprint flow for this repository.
3. Name the Blueprint `ramblelon-demo`.
4. Enter a strong, unique `ADMIN_PASSWORD` in Render's private environment-variable field; do not put it in chat or GitHub. Render automatically generates `SESSION_SECRET`.
5. Review the service and disk charges, then deploy when you accept them.
6. Wait for Live and open the HTTPS address Render assigns. The site is at `/` and the password-protected dashboard at `/dashboard`.
7. Submit a fake inquiry, sign in, and confirm the recommended quote. Emails remain previews: no SMTP provider is configured.

Deploy this Blueprint as a **Web Service**, not a Static Site; the booking API needs a running Node server. Render sets its own `PORT` and `RENDER` variables. SQLite and session files are stored on the persistent disk. This single-instance demo keeps rate-limit counts in memory; they reset when the service restarts. A Squarespace domain can be connected afterward using Render's Custom Domains settings without transferring domain registration.
