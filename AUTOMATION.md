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

The brief is also emailed to the MailerLite subscriber list via a native
Netlify Scheduled Function: `functions/send-signal.js`. The schedule
(`0 12 * * *`, daily at 12:00 UTC) is declared in `netlify.toml` under
`[functions."send-signal"]`, and the latest brief JSON is bundled with
the function deploy via `[functions].included_files`.

Configure these env vars in the Netlify dashboard (Site settings →
Environment variables):

| Variable | Purpose |
| --- | --- |
| `MAILERLITE_API_KEY` | Connect API token from MailerLite (required to actually send) |
| `MAILERLITE_GROUP_ID` | Subscriber group/segment ID to send to (required) |
| `SIGNAL_FROM_EMAIL` | Optional, defaults to `skdev@1commerce.online` |
| `SIGNAL_FROM_NAME` | Optional, defaults to `The Signal` |
| `SIGNAL_DISPATCH_TOKEN` | Optional bearer token for manual triggers |
| `SIGNAL_SITE_URL` | Optional, defaults to `https://1commercesolutions.com` |

Without `MAILERLITE_API_KEY` / `MAILERLITE_GROUP_ID` set, the function
logs the payload it would send and returns 200, so the schedule keeps
running cleanly until you fill the env vars.

### Manual trigger

If `SIGNAL_DISPATCH_TOKEN` is set, you can dispatch on demand:

```bash
curl -X POST https://1commercesolutions.com/api/send-signal \
  -H "Authorization: ******"
```

This is handy for hooking into the daily-content-agent GitHub Action
to send immediately after the new brief is published, instead of
waiting for the next scheduled tick.
