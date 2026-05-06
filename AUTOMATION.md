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
