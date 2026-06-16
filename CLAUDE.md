# CLAUDE.md - AI Assistant Guide for The-signal

## Project Overview

**The-signal** ("THE SIGNAL") is the static marketing + publishing site for
**1Commerce LLC**. It is a hand-built static HTML/CSS/JS site, enhanced with a
handful of Netlify serverless functions and two scheduled GitHub Actions that
generate content automatically. Netlify auto-deploys it on every push to `main`.

- **Repository**: `ksksrbiz-arch/The-signal`
- **Production domain**: `https://1commercesolutions.com`
- **Hosting**: Netlify (auto-deploys on push to `main`)
- **Primary branch**: `main`

> ⚠️ **`index.html` is a real HTML document**, not a PDF. (An earlier version of
> this guide incorrectly described the repo as a single served PDF — that is no
> longer true and was likely never accurate for the current site.) Edit it as
> normal HTML.

## Tech Stack

- **Static site** — raw HTML, CSS, and vanilla JS. No bundler, no framework.
- **No build step** — Netlify publishes the repo root (`.`) as-is. The
  `package.json` `build` script is intentionally a no-op (`echo`).
- **Netlify Functions** — Node serverless functions in `functions/`.
- **GitHub Actions** — scheduled Node automation that commits generated content.
- **Node** — `>=18` for local tooling; CI uses Node 20.
- **PWA** — `manifest.json` + `sw.js` service worker.
- **Fonts** — Google Fonts (Fraunces, IBM Plex Sans, JetBrains Mono).

## Repository Structure

```
The-signal/
├── index.html              # Landing page (real HTML)
├── 404.html                # Custom 404
├── app.js                  # Site JS: theme toggle, contact modal, reveal anims, hero canvas
├── base.css, style.css     # Styles (design tokens live in style.css :root)
├── sw.js, manifest.json    # PWA service worker + manifest
├── robots.txt, sitemap.xml # SEO (sitemap is auto-generated — see Automation)
├── og-image.png            # Social share image
├── _headers                # Netlify header rules (also see netlify.toml)
├── netlify.toml            # Netlify build, functions, redirects, headers, CSP
├── package.json            # Scripts + metadata (no runtime deps; no real build)
│
├── functions/              # Netlify serverless functions
│   ├── news.js             #   → /api/news      (RSS news aggregator)
│   ├── subscribe.js        #   → /api/subscribe (newsletter signup)
│   └── send-signal.js      #   → /api/send-signal + scheduled daily email
│
├── scripts/                # Node ESM automation (run by GitHub Actions)
│   ├── daily-content-agent.mjs
│   └── seo-agent.mjs
│
├── data/                   # Generated data
│   ├── latest-daily-signal.json   # bundled into the send-signal function
│   └── seo-report.json
│
├── assets/                 # brand/ (favicons, icons, social card), css/, js/
├── images/                 # Page imagery
│
├── about/  profile/  builds/  news/  videos/  reel-engine/   # section pages (index.html each)
├── archive/                # Weekly dispatches (013–018.html + index)
├── fieldnotes/             # Long-form notes/essays (many .html + index)
├── daily/                  # Dated daily briefs (auto-generated) + index
│
├── noir-reel-engine/       # Separate Python toolkit for reel/video generation
└── .github/workflows/      # daily-content-agent.yml, seo-maintenance-agent.yml
```

There are also many root-level `*.md` docs and `setup*` scripts (`.bat`/`.py`/
`.js`). These are internal notes/tooling — `netlify.toml` blocks `*.md`,
`*.bat`, and `*.py` from being served publicly (they return 404).

## Netlify Configuration (`netlify.toml`)

- `publish = "."`, `functions = "functions"` — no build command.
- **Scheduled function**: `send-signal` runs daily at `0 12 * * *` (12:00 UTC).
- **API rewrites**: `/api/news`, `/api/subscribe`, `/api/send-signal` →
  corresponding functions (status 200 rewrites).
- **Security headers + CSP** apply to all routes (frame-ancestors none,
  scoped script/style/connect/font/img/frame sources).
- **Redirects**: canonical `signal01.netlify.app/*` → production domain;
  trailing-slash normalization; legacy `/blog`, `/posts` → current sections;
  blocks for `*.md` / `*.bat` / `*.py`; catch-all → `404.html`.
- **Caching**: HTML `max-age=0, must-revalidate`; CSS/JS/SVG/fonts use
  `max-age=3600, stale-while-revalidate=86400`; `sw.js` is never cached.

## Automation (GitHub Actions)

Two scheduled workflows in `.github/workflows/` generate content and commit it
straight back to `main` (which then auto-deploys via Netlify):

| Workflow | Schedule (UTC) | Runs | Commits |
|----------|----------------|------|---------|
| `daily-content-agent.yml` | `15 11 * * *` (11:15) | `npm run automation:daily` (content + SEO) | `daily/`, `data/`, `sitemap.xml` |
| `seo-maintenance-agent.yml` | `45 11 * * *` (11:45) | `npm run seo:agent` | `data/seo-report.json`, `sitemap.xml` |

- The daily content agent needs the **`OPENAI_API_KEY`** repo secret (and an
  optional `OPENAI_MODEL` repo variable, default `gpt-4o-mini`). It can also be
  triggered manually via `workflow_dispatch` with an optional `signal_date`.
- Both can run manually from the Actions tab.
- **Code scanning**: GitHub CodeQL ("Analyze") runs on pull requests.

Because these bots push to `main`, expect periodic automated commits like
"Update daily Signal content" and "Refresh SEO maintenance report".

## Development Workflow

### Deployment

Auto-deploy via Netlify — no build step:
1. Push to `main`.
2. Netlify builds (bundling `functions/`) and deploys to the production domain.

Several Netlify projects build from this repo. `signal01` is the canonical one
(its `*.netlify.app` URL 301-redirects to `1commercesolutions.com`); other
projects (e.g. `thes1ignal`) also build previews. **`th3signal` is a legacy
project** and may report a failing deploy-preview check on PRs due to a
project-level build-command override that does **not** exist in this repo — that
failure is not caused by repo content changes.

### Branching

- `main` — production branch, auto-deployed by Netlify.
- Feature branches follow `claude/<description>` or standard naming. Open a PR
  into `main`; Netlify posts deploy previews on the PR for visual review.

### Commits

- Use clear, descriptive commit messages; keep each commit focused.

### Local Preview

The site uses root-relative asset paths, so serve it over HTTP:
```bash
python3 -m http.server 8080   # then open http://localhost:8080
```
Netlify Functions (`/api/*`) won't run under a plain HTTP server. To exercise
them locally, use the Netlify CLI (`netlify dev`).

## Common Tasks

### Editing the landing page
Edit `index.html` directly. Page-specific component styles live in its inline
`<style>` block; global/shared styles (header, footer, etc.) live in
`style.css`. Reuse the design tokens in `style.css` `:root` (e.g. `--active`
amber `#E8B86A`, `--faint`, `--font-mono`) rather than hard-coding values.

### Adding a new section page
Create `<section>/index.html` and link it from the header/footer nav in
`index.html` (and the mobile nav). Add it to `sitemap.xml` if the SEO agent
won't pick it up automatically.

### Changing a serverless function
Edit the file in `functions/`. Routes are wired in `netlify.toml` `[[redirects]]`.

### Editing styles
Touching `style.css`/`base.css`? They're linked with a `?v=` cache-bust query in
`index.html` — bump that token when you want clients to pick up changes promptly.

## Conventions for AI Assistants

1. **It's a real static site** — `index.html` and all `*.html` are editable
   HTML, not binaries.
2. **No build tools** — don't introduce a bundler/framework unless explicitly
   asked. Keep changes static and dependency-free.
3. **Match the existing design system** — reuse `style.css` tokens and the
   established markup patterns; the aesthetic is deliberate (mono labels, amber
   accent, dossier cards).
4. **Mind the automation** — `daily/`, `data/`, and `sitemap.xml` are
   bot-maintained; avoid hand-editing them unless that's the task.
5. **Preview before merging** — use the Netlify deploy-preview link on the PR
   to verify visual changes (a local server can't render `/api/*` functions).
6. **Deploy = push to `main`** (or merge a PR into it).
