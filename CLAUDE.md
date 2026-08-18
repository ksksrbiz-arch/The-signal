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

Three scheduled workflows in `.github/workflows/` generate content and commit it
straight back to `main` (which then auto-deploys via Netlify):

| Workflow | Schedule (UTC) | Runs | Commits |
|----------|----------------|------|---------|
| `archive-transmission-agent.yml` | `30 10 * * *` (10:30) | `npm run archive:agent` + index rebuild | `archive/`, `data/`, `images/covers/`, `sitemap.xml` |
| `daily-content-agent.yml` | `15 11 * * *` (11:15) | `npm run automation:daily` (content + SEO) | `daily/`, `data/`, `sitemap.xml` |
| `seo-maintenance-agent.yml` | `45 11 * * *` (11:45) | `npm run seo:agent` | `data/seo-report.json`, `sitemap.xml` |

- The **archive transmission agent** publishes one long-form dispatch per day.
  It needs **`GROQ_API_KEY`** and/or **`GEMINI_API_KEY`** (optional repo
  variables `GROQ_MODEL_LARGE`, `GROQ_MODEL_SMALL`, `GEMINI_MODEL` override the
  model IDs). See "Archive transmission agent" below — **read that section
  before changing it.**
- The daily content agent needs the **`OPENAI_API_KEY`** repo secret (and an
  optional `OPENAI_MODEL` repo variable, default `gpt-4o-mini`). It can also be
  triggered manually via `workflow_dispatch` with an optional `signal_date`.
- All three can run manually from the Actions tab.
- **Code scanning**: GitHub CodeQL ("Analyze") runs on pull requests.

Because these bots push to `main`, expect periodic automated commits like
"Update daily Signal content" and "Publish archive transmission №NNN".

### Publishing without GitHub Actions

**GitHub Actions is unavailable on this repo**, which is why every scheduled
workflow failed daily for weeks. The remaining two workflows have their
`schedule:` blocks commented out (files kept, `workflow_dispatch` still works).

The archive workflow was deleted outright, because the current design **cannot**
run in Actions: Claude writes the dispatch, so there is no unattended runner
that can produce one. Publishing happens through a **Claude routine** instead —
"Signal — daily archive transmission", daily at 10:30 UTC.

### Archive transmission agent

One dispatch per run, published to `/archive/`. Authoring and enforcement are
deliberately split, so the writing can improve while the guarantees stay fixed:

| Half | Where | What it does |
|------|-------|--------------|
| Authoring | Claude, in the routine session | Reads the brief, writes the dispatch |
| Enforcement | `scripts/archive-pipeline.mjs` | Gates, transformer, renderer, index, state |
| Learning | `scripts/archive-craft.mjs` | Measures each run, accumulates rules |

The daily loop is three commands:

```bash
npm run archive:brief                        # what to write, and what not to repeat
# …Claude writes the dispatch to a JSON file…
npm run archive:compose -- draft.json        # gate, publish, push, ping
```

`archive:brief` prints the next unused topic, the house voice, the hard
requirements, the standing rubric, open lessons, drift warnings, and the
openings of the last five dispatches. `archive:compose` runs every gate and
either publishes or refuses. Add `--dry-run` to gate without writing.

**Exit codes from compose:** `0` published · `2` draft refused (revise it) ·
`1` machinery broke.

**The guards exist for a reason — do not relax them.** `/daily/` failed because
a generator cycled seven topics and produced 54 near-identical pages. So:

- **Topics are consumed once.** ~120 in `scripts/archive-topics.mjs`, used ids
  recorded in `data/archive-state.json`. An exhausted queue is a hard error, not
  a wraparound — write new topics instead.
- **Gates are fatal**: minimum length and sections, banned phrasing, duplicate
  headings, and shingle-similarity against every existing dispatch.
- **Fabrication gates.** Dispatches are analytical, never build reports. Claude
  cannot know what actually shipped, and this site's whole positioning is that
  its claims are checkable, so drafts asserting deploy counts, revenue movement,
  population statistics, cited studies, or client anecdotes are refused. Real
  build claims belong in hand-written dispatches.

`npm run test:archive` covers the transformer, every gate, and the renderer
offline. Keep it passing.

### The self-improvement layer

The gates stop bad pages shipping; they cannot make the writing better. That is
`scripts/archive-craft.mjs`, storing to `data/archive-craft.json` (committed, so
learning survives the ephemeral routine sessions that produce it).

Because the site runs no analytics, there is no traffic signal to learn from.
Improvement therefore comes from measurable properties of the work itself:

1. **Gate margins** — not pass/fail but *how close*. A dispatch passing
   similarity at 0.27 against a 0.28 limit is a warning about the next one.
2. **Structural drift** — opening shapes, heading construction, section counts,
   sentence-length variance across the last 8 dispatches. A writer converging on
   a formula is exactly how `/daily/` decayed, and it shows up here long before a
   similarity gate would catch it.
3. **Lesson promotion** — a gate failure is recorded as a lesson; the same
   lesson twice is promoted into the standing rubric and appears in every future
   brief. This is the ratchet that makes the system compound rather than just
   keep a diary.

Do not hand-edit `data/archive-craft.json` to remove an inconvenient rule. If a
rule is wrong, fix the underlying gate or write a better rule — the file is the
memory, and editing it to feel better is how the memory stops being true.

### Why `/daily/` is noindex

The daily brief generator picks its theme with `topics[dayNumber % topics.length]`
over a 7-entry array. Across 54 dated pages that produced 7 clusters of ~8
near-identical briefs, each cluster competing with itself for one query. Nothing
in the section could rank and the volume of thin pages weighed on the whole site.

So: **dated `/daily/*.html` pages are `noindex, follow`**, the `/daily/` hub
stays indexed, and the evergreen versions of those seven themes live at
`/playbooks/`. `scripts/seo-agent.mjs` excludes any page carrying a `noindex`
directive from `sitemap.xml` automatically, derived from the page itself.

Do not re-index the daily briefs without first fixing the topic rotation — the
noindex is load-bearing, not an oversight.

### Archive transmission agent

`scripts/archive-agent.mjs` publishes one dispatch per run. It is built to avoid
repeating the `/daily/` failure, and each guard matters:

- **Topics are consumed once.** `scripts/archive-topics.mjs` holds ~120 distinct
  topics; used ids are recorded in `data/archive-state.json` and never reused.
  An exhausted queue is a hard error, not a wraparound — add topics instead.
- **Three-stage pipeline**: plan (Groq → JSON outline) → draft (Groq → long-form)
  → edit (Gemini → specificity pass). Using a different model for the edit
  catches padding the drafting model cannot see. Providers fall back to each
  other, so one rate-limited free tier does not fail the run.
- **Gates are fatal.** Minimum length/sections, banned phrasing, duplicate
  headings, and shingle-similarity against every existing dispatch. A failed
  gate publishes nothing and exits non-zero; the workflow then commits nothing.
  A quiet day is the intended behaviour, not a bug.
- **Fabrication gates.** Generated dispatches are analytical, never build
  reports: a model cannot know what actually shipped, and this site's whole
  positioning is that its claims are checkable. Drafts asserting deploy counts,
  revenue movement, population statistics, cited studies, or client anecdotes
  are rejected. Real build claims belong in hand-written dispatches.

`npm run test:archive` covers the transformer, every gate, and the renderer
offline. The workflow runs it before any model call — keep it passing.

Manual runs: Actions → "Archive transmission agent" → Run workflow, with
optional `signal_date`, `topic_id`, and a `dry_run` toggle that gates a draft
without writing anything.

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

### Editing the playbooks

`/playbooks/` holds the seven evergreen pillar pages that consolidate what the
daily briefs cover in passing. Content lives in `scripts/playbooks-content.mjs`;
the renderer is `scripts/build-playbooks.mjs`. Edit the content module and run
`npm run playbooks` — never hand-edit `playbooks/*.html`, it is generated.

The site nav is defined once, in `scripts/lib/site-chrome.mjs` (`NAV_ITEMS`).
`blog/`, `blog/series/`, and `blog/issues/` are generated from it, so editing
their nav by hand is pointless — the next automation run overwrites it. Add nav
entries there and re-run the generators.

Keep one page per search intent. If a new theme is added to the daily brief
generator, add its pillar here too.

### Adding a new section page
Create `<section>/index.html` and link it from the header/footer nav in
`index.html` (and the mobile nav). Add it to `sitemap.xml` if the SEO agent
won't pick it up automatically.

### Dispatch cover art
Archive/dispatch card media comes from a **generative cover-art system**, not
stock or hand-made images. Covers are deterministic SVGs at `images/covers/NNN.svg`,
generated by `scripts/generate-covers.mjs` (run `npm run covers`). To give a new
dispatch a cover, add a row to the `POSTS` registry in that script, re-run, and
reference `images/covers/NNN.svg` as a plain `<img>` (no `<picture>`/AVIF/WebP
needed — they're ~3–10 KB). Accent color is keyed to dispatch type; the motif is
seeded from the title so covers never repeat. Full details in `MEDIA.md`. Keep
content-specific infographics (the `barbell/` set, AI-Pulse, UnifyOne/ecosystem
showcases) as real content — covers are for decorative/placeholder slots.

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
