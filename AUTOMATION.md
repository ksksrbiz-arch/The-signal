# Daily SEO and content automation

THE SIGNAL now includes two GitHub Actions agents:

- **Daily content agent** (`.github/workflows/daily-content-agent.yml`) runs every day at 11:15 UTC and can also be triggered manually.
- **SEO maintenance agent** (`.github/workflows/seo-maintenance-agent.yml`) runs every day at 11:45 UTC and can also be triggered manually.

## What runs

```bash
npm run content:agent   # generates /daily/YYYY-MM-DD.html, /daily/, and latest JSON data
npm run seo:agent       # refreshes sitemap.xml and data/seo-report.json
npm run automation:daily
```

The content agent is deterministic by default, so it works without paid APIs or secrets. If an `OPENAI_API_KEY` repository secret is added, it will use the configured model to draft the daily operating brief, then safely escapes generated text before publishing.

## Optional AI setup

1. Open GitHub repository settings.
2. Add a repository secret named `OPENAI_API_KEY`.
3. Optionally add a repository variable named `OPENAI_MODEL` to override the default model.
4. Run **Daily content agent** manually once to confirm the secret and model work.

## Outputs

- `daily/YYYY-MM-DD.html` — public daily operating brief.
- `daily/index.html` — public daily brief index.
- `data/latest-daily-signal.json` — latest brief data for future integrations.
- `data/seo-report.json` — machine-readable SEO audit output.
- `sitemap.xml` — refreshed sitemap containing all public HTML pages.

## Email dispatch (Netlify Scheduled Function)

The brief is emailed via [Resend](https://resend.com) broadcasts to the
"The Signal — Newsletter" segment, via a native Netlify Scheduled Function:
`functions/send-signal.js`. The schedule (`0 12 * * *`, daily at 12:00 UTC)
is declared in `netlify.toml` under `[functions."send-signal"]`, and the
latest brief JSON is bundled with the function deploy via
`[functions].included_files`.

The function creates a new Resend broadcast from the brief's rendered
HTML/text, then sends it (two calls: `POST /broadcasts`, then
`POST /broadcasts/:id/send`) — no broadcast is composed by hand in the
Resend dashboard for the daily send.

Configure these env vars in the Netlify dashboard (Site settings →
Environment variables):

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Resend API key, **sending_access only**, scoped to the `1commercesolutions.com` domain (required to actually send) |
| `RESEND_SIGNAL_SEGMENT_ID` | The "The Signal — Newsletter" segment ID in Resend (required) |
| `SIGNAL_FROM_EMAIL` | Optional, defaults to `signal@1commercesolutions.com` — must be an address on a domain verified for sending in Resend (`1commerce.online` is **not** verified there; do not point this at it) |
| `SIGNAL_FROM_NAME` | Optional, defaults to `The Signal` |
| `SIGNAL_DISPATCH_TOKEN` | Optional bearer token for manual triggers |
| `SIGNAL_SITE_URL` | Optional, defaults to `https://1commercesolutions.com` |

Without `RESEND_API_KEY` / `RESEND_SIGNAL_SEGMENT_ID` set, the function
logs the payload it would send and returns 200, so the schedule keeps
running cleanly until you fill the env vars.

### Manual trigger

If `SIGNAL_DISPATCH_TOKEN` is set, you can dispatch on demand:

```bash
curl -X POST https://1commercesolutions.com/api/send-signal \
  -H "Authorization: Bearer $SIGNAL_DISPATCH_TOKEN"
```

This is handy for hooking into the daily-content-agent GitHub Action
to send immediately after the new brief is published, instead of
waiting for the next scheduled tick.

## Subscriber pipeline (Blobs → Resend)

`functions/subscribe.mjs` (`/api/subscribe`) and `functions/confirm.mjs`
(`/api/confirm`) are the self-hosted signup flow used by the root
`index.html`. Netlify Blobs (the `subscribers` store) is always the source
of truth for signup/confirm state. On confirmation, both functions
best-effort mirror the subscriber into Resend via
`functions/lib/resend-contacts.mjs`, so `send-signal.js` can actually reach
them — this never blocks or fails the signup itself if Resend is
unreachable or unconfigured.

That mirror needs its own env var, deliberately **separate** from the
sending-only key above (Resend does not allow a `sending_access` key to
manage contacts, and has no narrower "contacts" scope):

| Variable | Purpose |
| --- | --- |
| `RESEND_CONTACTS_API_KEY` | Resend API key, **full_access**, used only to create/update contacts in the segment |
| `RESEND_SIGNAL_SEGMENT_ID` | Same segment ID as above |

### Known gap: most of the site still posts straight to MailerLite

The shared page footer (`scripts/lib/site-chrome.mjs`, `buildChrome()`) still
renders a `<form>` that POSTs natively to a MailerLite JSONP endpoint
(`assets.mailerlite.com/jsonp/...`), independent of `/api/subscribe`. That
footer is baked into essentially every page **except** the root
`index.html` — including pages already published from `site-chrome.mjs`
(playbooks, blog hub/series/issues) and pages that copy the same markup by
hand (archive, fieldnotes, daily, about). `app.js`'s generic
`form.subscribe-form` handler only adds client-side validation/busy-state;
it deliberately lets that native POST proceed.

Net effect: signups from the homepage reach Blobs → Resend (as above), but
signups from almost every other page today still go straight to a live
MailerLite list that this pipeline has no visibility into. Fixing
`site-chrome.mjs` corrects the template for future/regenerated pages, but
does **not** retroactively fix already-published static HTML — that's a
separate, larger sweep, not something to do incidentally alongside an
unrelated change. Until it's addressed, do not assume the Resend segment or
the Blobs store reflects the site's full subscriber base.
