[![Netlify Status](https://api.netlify.com/api/v1/badges/31c4764b-f9c4-4531-93ca-b367db629132/deploy-status)](https://app.netlify.com/projects/signal01/deploys)

# THE SIGNAL

The public site and weekly-dispatch platform for **1Commerce LLC** — a
multi-page static site (hand-authored HTML/CSS/JS) backed by a few Netlify
serverless functions and two scheduled automation agents.

🌐 **Live**: https://1commercesolutions.com
📂 **[Repository Atlas](ATLAS.md)** — Full catalog of all `ksksrbiz-arch` public repositories
🤖 **[CLAUDE.md](CLAUDE.md)** — Architecture guide for AI assistants and contributors

---

## Stack

- **Static front end** — no framework, no bundler, no runtime dependencies.
- **Netlify** — hosting, deploy previews, redirects/headers, scheduled functions.
- **Netlify Functions** (Node ≥ 18) — RSS news aggregator, MailerLite signup,
  and a scheduled daily email dispatch.
- **Automation agents** (`scripts/*.mjs`, run via GitHub Actions) — daily
  content generation and SEO maintenance.

Design system: gold accent `#E8B86A`; Fraunces / IBM Plex Sans / JetBrains Mono.
Light/dark theming via `data-theme`. No analytics, no tracking — the only stored
state is the theme preference.

## Structure

```
index.html        Homepage              functions/   Serverless API + scheduled dispatch
404.html          Custom 404            scripts/     Daily content + SEO agents
app.js            Shared JS             data/        Generated artifacts (briefs, SEO report)
style.css         Primary stylesheet    assets/      Brand + media
netlify.toml      Headers / redirects   .github/     Automation workflows
about/ archive/ fieldnotes/ builds/ news/ videos/ reel-engine/ profile/ daily/   Content pages
```

## API endpoints

The front end calls clean `/api/*` paths (rewritten in `netlify.toml`):

| Endpoint           | Function          | Purpose                                   |
|--------------------|-------------------|-------------------------------------------|
| `/api/news`        | `news.js`         | Aggregates ~8 tech RSS feeds (no API key) |
| `/api/subscribe`   | `subscribe.js`    | Adds emails to a MailerLite group         |
| `/api/send-signal` | `send-signal.js`  | Dispatches the latest daily brief by email (scheduled daily 12:00 UTC; manual trigger available) |

Secrets (e.g. `MAILERLITE_API_KEY`) live in Netlify environment variables — never
in the repo.

## Local development

```bash
# Static preview (no functions)
python3 -m http.server 8080      # → http://localhost:8080

# With serverless functions / /api routes
netlify dev
```

## npm scripts

```bash
npm run content:agent     # generate the daily brief → data/latest-daily-signal.json
npm run seo:agent         # SEO maintenance → data/seo-report.json
npm run automation:daily  # both, in sequence
```

There is intentionally no build step (`publish = "."`).

## Deployment

Push to `main` → Netlify auto-deploys. Pull requests get Netlify deploy previews.
See [CLAUDE.md](CLAUDE.md) for the full architecture guide and contribution
conventions.
