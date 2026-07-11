# Cover-Art Media System

THE SIGNAL uses a **generative cover-art system** for dispatch/archive media
instead of hand-made or stock imagery. Each dispatch gets a unique, on-brand
SVG cover derived deterministically from its identity — so the archive reads as
one coherent system, there is zero repetition, and future posts get art with no
manual design work.

## What it produces

- `images/covers/NNN.svg` — one 1200×675 (16:9, OG-friendly) SVG per dispatch.
- Tiny and dependency-free: ~3–10 KB each (vs. the 2–5 MB PNG infographics),
  served same-origin as a plain `<img>`. No runtime JS, no external fonts, no
  build step, CSP-safe.

## Design language

- The site "dossier" look: dark ink field, faint grid, corner registration
  ticks, mono labels, a single amber-family accent.
- **Accent is keyed to dispatch type** so the archive is visually categorized:
  - `dispatch` → amber `#E8B86A`
  - `build` → green `#4FB477`
  - `strategy` → rust `#C77B54`
  - `system` → steel `#6E8BB0`
- **Motif is chosen by a seed hash of the title** (waves, node graph, radar,
  bar field, orbits, strata), so no two covers repeat. Same input always
  produces the same art (deterministic — stable across rebuilds).

## Regenerating / adding a cover

The registry lives at the bottom of `scripts/generate-covers.mjs` (`POSTS`).

```bash
# add or edit a row in POSTS: { n: '022', type: 'build', title: '…' }
npm run covers        # → writes images/covers/022.svg
```

Then reference it as ordinary media (no `<picture>`, no AVIF/WebP needed):

```html
<div class="arc-item-media">
  <img src="../images/covers/022.svg"
       alt="THE SIGNAL — Dispatch №022: <Title>"
       loading="lazy" decoding="async">
</div>
```

The featured slot uses the same file with `loading="eager"`.

## Where it's used

- `archive/index.html` — every dispatch card + the featured slot (001–021).
- Available for any decorative/placeholder media slot site-wide. Content-
  specific infographics that actually illustrate a page (e.g. the `barbell/`
  set inside dispatch №016, the AI-Pulse graphic on `/news/`, the UnifyOne /
  Verified-Build showcase graphics on the home and section pages) are kept as
  real content and intentionally **not** replaced by covers.

## Notes

- SVG `<text>` falls back to the system monospace when rendered as an `<img>`
  (external fonts can't load inside an image-embedded SVG). This is intentional
  and on-brand; the covers do not depend on Google Fonts.
- `og:image` for social sharing still uses the site's `og-image.png`. Covers
  are page/list media, not the social card.
