# CLAUDE.md - AI Assistant Guide for The-signal

## Project Overview

**The-signal** is the public site and dispatch platform for **1Commerce LLC** —
a multi-page static site (HTML/CSS/JS) with a handful of Netlify serverless
functions and two scheduled automation agents. It is auto-deployed from git to
Netlify.

- **Repository**: `ksksrbiz-arch/The-signal`
- **Production URL**: https://1commercesolutions.com
- **Hosting**: Netlify (auto-deploys on push to `main`)
- **Primary branch**: `main`
- **Netlify sites**: `signal01` (primary) and `th3signal` (legacy/mirror)

> **Note:** Despite its `.html` extension, `index.html` is a real, hand-written
> HTML document — not a PDF. (An older version of this guide claimed otherwise;
> that was incorrect.)

## Repository Structure

```
The-signal/
├── index.html              # Homepage
├── 404.html                # Custom 404
├── app.js                  # Shared JS: theme toggle, mobile nav, contact modal, scroll reveal
├── base.css / style.css    # Shared styles (style.css is the large primary sheet)
├── sw.js                   # Service worker (PWA)
├── manifest.json           # PWA manifest
├── netlify.toml            # Headers, caching, redirects, function config
├── package.json            # Scripts + Node engine (no runtime deps)
│
├── about/    archive/    fieldnotes/    builds/      # Content pages
├── news/     videos/     reel-engine/   profile/      # (each has its own index.html)
├── daily/                                             # Daily brief page
│
├── functions/              # Netlify serverless functions
│   ├── news.js             #   RSS aggregator          → /api/news
│   ├── subscribe.js        #   MailerLite signup        → /api/subscribe
│   └── send-signal.js      #   Scheduled email dispatch → /api/send-signal
│
├── scripts/                # Automation agents (run via npm + GitHub Actions)
│   ├── daily-content-agent.mjs
│   └── seo-agent.mjs
│
├── data/                   # Generated artifacts
│   ├── latest-daily-signal.json
│   └── seo-report.json
│
├── assets/  images/  videos/  archive/               # Static media & content
├── noir-reel-engine/       # Separate Python video-reel tooling (own README)
│
├── .github/workflows/      # daily-content-agent.yml, seo-maintenance-agent.yml
└── *.md                    # Internal docs (NOT publicly served — see redirects)
```

## Tech Stack

- **No framework / no bundler** — hand-authored HTML, CSS, and vanilla JS.
- **No runtime dependencies** — `package.json` has empty `dependencies`.
- **Netlify Functions** — Node ≥ 18, native `fetch`. Serverless API + a
  scheduled function.
- **Automation agents** — Node ESM scripts (`scripts/*.mjs`) driven by GitHub
  Actions. The `noir-reel-engine/` subdir is a separate Python toolset.
- **Netlify** — hosting, deploys, redirects, headers, and scheduled functions.

### Design system

- **Accent color**: `#E8B86A` (gold).
- **Fonts**: Fraunces (serif headings), IBM Plex Sans (body), JetBrains Mono
  (labels/mono). Loaded from Google Fonts.
- **Theming**: light/dark via the `data-theme` attribute; toggle in `app.js`.
  Theme preference is the **only** cookie/storage the site uses — no analytics,
  no tracking.

## Serverless Functions & API

The front end calls clean `/api/*` paths; `netlify.toml` rewrites them to the
function path.

| Endpoint            | Function           | Purpose |
|---------------------|--------------------|---------|
| `/api/news`         | `news.js`          | Aggregates ~8 tech RSS feeds (no API key). |
| `/api/subscribe`    | `subscribe.js`     | Adds emails to a MailerLite group. |
| `/api/send-signal`  | `send-signal.js`   | Dispatches the latest daily brief as an email campaign. |

- **`send-signal`** is a **scheduled function** (cron in `netlify.toml`,
  `[functions."send-signal"]`, default `0 12 * * *` = daily 12:00 UTC). It can
  also be triggered manually via `POST /api/send-signal` with an `Authorization`
  header.
- **Env vars** (set in Netlify, never committed): `MAILERLITE_API_KEY`, plus the
  auth token used by `send-signal`'s manual trigger.

## Automation Agents

- `npm run content:agent` → `scripts/daily-content-agent.mjs` — generates the
  daily brief and writes `data/latest-daily-signal.json`.
- `npm run seo:agent` → `scripts/seo-agent.mjs` — SEO maintenance; writes
  `data/seo-report.json`.
- `npm run automation:daily` runs both in sequence.
- These run on schedule via the GitHub Actions workflows in `.github/workflows/`.
  The content agent publishes ~11:15 UTC, shortly before `send-signal` dispatches.

## Development Workflow

### Deployment

Auto via Netlify: push to `main` → Netlify deploys (no build step;
`publish = "."`). PRs get Netlify deploy previews.

### Branching

- `main` — production, auto-deployed.
- `master` — legacy branch.
- Feature branches: `claude/<description>` or standard naming.

### Local preview

```bash
python3 -m http.server 8080   # then open http://localhost:8080
```

Functions don't run under a plain static server — use `netlify dev` if you need
to exercise `/api/*` locally.

### Commits

- Clear, descriptive, single-purpose commit messages.
- Commit or push only when asked; branch off `main` first if needed.

## Netlify Configuration Notes (`netlify.toml`)

- **Security headers + CSP** apply to all routes. If you add a new external
  script/style/font/image/connect origin, update the `Content-Security-Policy`
  or the browser will block it.
- **Caching**: CSS/JS/SVG/woff2 use `max-age=3600, stale-while-revalidate=86400`
  (deliberately not `immutable`, since filenames are unversioned). HTML is
  `must-revalidate`; `sw.js` is never cached. Static asset links carry a
  `?v=YYYYMMDD` query string — bump it when you want clients to refetch sooner.
- **Internal docs are not public**: `/*.md`, `/*.bat`, and `/*.py` are forced to
  404. Don't rely on serving any `.md` (including this file) from the live site.
- **Redirects** handle the canonical domain, trailing-slash normalization, and
  legacy `/blog` & `/posts` paths.

## Conventions for AI Assistants

1. **Match the existing style.** New homepage sections follow the card pattern
   (e.g. `cathedral-card`, `client-tier-card`, `partner-card`) with the gold
   accent. Page-specific CSS lives in an inline `<style>` block in that page's
   `index.html`; shared CSS lives in `style.css`.
2. **Keep external requests minimal.** The site avoids trackers and third-party
   assets. Prefer inline SVG / local assets over hotlinking. New origins require
   a CSP update.
3. **Don't add build tooling** unless asked — there is intentionally none.
4. **Functions are plain Node** (≥18, native `fetch`). Keep secrets in Netlify
   env vars, never in the repo.
5. **Test before claiming done.** Preview locally; for `/api/*` use `netlify dev`.
6. **This guide is the source of truth** for project shape — update it when the
   architecture changes.
