# 🔍 SITE AUDIT & TODO

**Last updated**: June 2026
**Status**: Production-stable. Earlier critical issues resolved; remaining items are polish & enhancements.

> This file tracks open work. The full project architecture lives in
> [CLAUDE.md](CLAUDE.md); the public overview is in [README.md](README.md).

---

## ✅ Resolved (kept for history)

These were the original "critical" issues from the January 2025 audit. All are
now closed:

- ✅ **Cloudflare middleware removed.** `functions/_middleware.js` (Cloudflare
  Pages code) is gone. The site runs purely on Netlify Functions.
- ✅ **Functions rebuilt for Netlify.** Current functions: `news.js`
  (`/api/news`), `subscribe.js` (`/api/subscribe`), and the scheduled
  `send-signal.js` (`/api/send-signal`). The old logging-only `send-email.js`
  was replaced.
- ✅ **Newsletter signup is live.** `subscribe.js` writes to MailerLite; the
  hero and footer forms post to `/api/subscribe`.
- ✅ **Scheduled email dispatch.** `send-signal.js` runs daily at 12:00 UTC via
  the cron in `netlify.toml`, reading `data/latest-daily-signal.json`.
- ✅ **Automation agents added.** `scripts/daily-content-agent.mjs` and
  `scripts/seo-agent.mjs`, driven by GitHub Actions.
- ✅ **Security headers + CSP, caching, and redirects** configured in
  `netlify.toml` (internal `.md`/`.bat`/`.py` files are 404'd).
- ✅ **Accessibility baseline**: skip-to-content link, ARIA labels on nav/forms,
  reduced-motion-friendly reveals.

---

## 🟡 Open — polish

### Typography & readability
- [ ] Audit remaining small type (mono labels/tags at ~9px) for WCAG legibility
      on mobile.
- [ ] Confirm a consistent rem-based type scale across all pages (some inline
      `<style>` blocks still use ad-hoc sizes).

### Accessibility
- [ ] Run a contrast pass on muted text against both light and dark themes
      (target AA: 4.5:1 body, 3:1 large).
- [ ] Verify all interactive controls meet the 44px touch-target minimum.
- [ ] Screen-reader pass on the contact modal and mobile nav focus trapping.

### Mobile UX
- [ ] Re-test card grids (dossier / cathedral / partners / feature-matrix) at
      narrow widths for cramping or overflow.
- [ ] Check `builds/` and `news/` iframes/cards on small screens.

---

## 🟢 Open — enhancements

- [ ] **News page**: explicit loading + error/retry UI for `/api/news`.
- [ ] **Trusted Partners**: add remaining affiliate partners as they're vetted;
      keep the subtle disclosure and `rel="sponsored"` on each link.
- [ ] **Search/filter** across archive + fieldnotes content.
- [ ] **Performance**: Lighthouse pass; confirm lazy-loading and image sizing.
- [ ] **Content automation**: monitor the daily-content + SEO agent runs for
      drift; surface failures.

---

## 🧪 Testing checklist (before merging notable changes)

- [ ] Desktop: Chrome, Firefox, Safari, Edge.
- [ ] Mobile: iOS Safari, Android Chrome (multiple sizes).
- [ ] Keyboard navigation + visible focus indicators.
- [ ] `/api/*` endpoints respond correctly (use `netlify dev`).
- [ ] No console errors; CSP not blocking any intended resource.
- [ ] Netlify deploy preview renders cleanly on the PR.
