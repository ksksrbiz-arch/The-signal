// Builds /playbooks/ — the evergreen pillar pages that consolidate the seven
// themes the daily brief generator rotates through.
//
// Why this exists: /daily/ published ~8 near-identical pages per theme, so each
// theme's pages competed with each other and none ranked. Those dated briefs are
// now noindex; these pages are the single indexable destination per theme.
//
// Content lives in scripts/playbooks-content.mjs. Run with `npm run playbooks`.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { playbooks } from './playbooks-content.mjs';
import { escapeHtml, safeJsonLd, siteFooter, siteHeader } from './site-chrome.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'playbooks');
const SITE_URL = 'https://1commercesolutions.com';
const CSS_VERSION = '20260711a';

const HEADER = siteHeader(1, 'Playbooks');
const FOOTER = siteFooter(1);

// The `daily-*` rules mirror the inline block the daily briefs already ship, so
// playbooks inherit the same reading layout. The `playbook-*` rules add the
// pillar-only pieces: the lead paragraphs, the FAQ list, and the index grid.
const PAGE_STYLE = `<style>
.daily-wrap{max-width:840px;margin:0 auto;padding:clamp(56px,8vw,96px) 24px}
.daily-kicker{font-family:var(--font-mono);font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--verified);margin-bottom:16px}
.daily-title{font-family:var(--font-display);font-size:clamp(2.4rem,7vw,4.4rem);line-height:1.04;margin:0 0 18px;color:var(--text)}
.daily-dek{font-family:var(--font-display);font-size:clamp(1.1rem,2vw,1.35rem);line-height:1.55;color:#DFD3BA;margin:0 0 32px}
.daily-meta{font-family:var(--font-mono);font-size:12px;color:var(--faint)}
.daily-summary{display:grid;gap:16px;margin:34px 0;padding:24px;border:1px solid var(--rule);background:var(--panel);border-radius:var(--r)}
.daily-summary h2{font-family:var(--font-mono);font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--verified);margin:0}
.daily-takeaways{margin:0;padding-left:20px;color:var(--muted);line-height:1.7}
.daily-section{border-top:1px solid var(--rule);padding-top:28px;margin-top:32px}
.daily-section h2{font-family:var(--font-display);font-size:1.6rem;color:var(--text);margin:0 0 12px}
.daily-section p{font-size:18px;line-height:1.75;color:var(--muted)}
.daily-standard{margin-top:36px;padding:18px 20px;border-left:3px solid var(--verified);background:rgba(232,184,106,.06);color:var(--muted);line-height:1.65}
.daily-prompts{padding-left:20px;line-height:1.75;color:var(--muted)}
.daily-prompts li{margin-bottom:8px}
.playbook-intro{font-size:19px;line-height:1.75;color:var(--muted);margin:0 0 20px}
.playbook-faq-item{margin-top:22px}
.playbook-faq-item h3{font-family:var(--font-display);font-size:1.15rem;color:var(--text);margin:0 0 8px}
.playbook-faq-item p{font-size:17px;line-height:1.7;color:var(--muted);margin:0}
.playbook-grid{display:grid;gap:20px;margin-top:36px}
@media(min-width:720px){.playbook-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
.playbook-card{padding:24px;border:1px solid var(--rule);background:var(--panel);border-radius:var(--r)}
.playbook-card h2{font-family:var(--font-display);font-size:1.35rem;line-height:1.25;margin:10px 0 12px}
.playbook-card h2 a{color:var(--text);text-decoration:none}
.playbook-card h2 a:hover{color:var(--verified)}
.playbook-card p{color:var(--muted);line-height:1.65;margin:0 0 12px}
</style>`;

function head({ title, description, canonical, keywords, jsonLd }) {
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="keywords" content="${escapeHtml(keywords)}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:type" content="article">
<meta property="og:url" content="${canonical}">
<meta property="og:site_name" content="THE SIGNAL">
<meta property="og:image" content="${SITE_URL}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${escapeHtml(title)}">
<meta property="og:image:type" content="image/png">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${SITE_URL}/og-image.png">
<meta name="twitter:image:alt" content="${escapeHtml(title)}">
<meta name="author" content="Keith">
<meta name="geo.region" content="US-OR">
<meta name="geo.placename" content="Canby, Oregon">
<meta name="geo.position" content="45.2640;-122.6918">
<meta name="ICBM" content="45.2640, -122.6918">
<meta name="theme-color" content="#E8B86A">
<link rel="icon" type="image/svg+xml" href="/assets/brand/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/brand/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/brand/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">
<link rel="alternate" type="application/rss+xml" title="THE SIGNAL" href="/feed.xml">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="THE SIGNAL">
<link rel="stylesheet" href="../base.css?v=${CSS_VERSION}">
<link rel="stylesheet" href="../style.css?v=${CSS_VERSION}">
${PAGE_STYLE}
${jsonLd.map((block) => `<script type="application/ld+json">\n${safeJsonLd(block)}\n</script>`).join('\n')}
</head>
<body>`;
}

const SCRIPTS = `<script src="../app.js?v=${CSS_VERSION}" defer></script>
</body>
</html>
`;

function playbookPage(pb, others) {
  const canonical = `${SITE_URL}/playbooks/${pb.slug}.html`;

  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: pb.title,
    description: pb.description,
    keywords: pb.keyword,
    author: { '@type': 'Person', name: 'Keith' },
    publisher: {
      '@type': 'Organization',
      name: '1Commerce LLC',
      url: `${SITE_URL}/`,
    },
    mainEntityOfPage: canonical,
    image: `${SITE_URL}/og-image.png`,
    datePublished: pb.published,
    dateModified: pb.updated,
  };

  const faqPage = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: pb.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'THE SIGNAL', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Playbooks', item: `${SITE_URL}/playbooks/` },
      { '@type': 'ListItem', position: 3, name: pb.navTitle, item: canonical },
    ],
  };

  const sectionsHtml = pb.sections
    .map(
      (s) => `  <section class="daily-section">
    <h2>${escapeHtml(s.h2)}</h2>
${s.paras.map((p) => `    <p>${escapeHtml(p)}</p>`).join('\n')}
  </section>`,
    )
    .join('\n');

  const faqHtml = pb.faqs
    .map(
      (f) => `    <div class="playbook-faq-item">
      <h3>${escapeHtml(f.q)}</h3>
      <p>${escapeHtml(f.a)}</p>
    </div>`,
    )
    .join('\n');

  const relatedHtml = others
    .map(
      (o) =>
        `      <li><a href="./${o.slug}.html">${escapeHtml(o.navTitle)}</a> — ${escapeHtml(o.dek)}</li>`,
    )
    .join('\n');

  return `${head({
    title: `${pb.title} | THE SIGNAL`,
    description: pb.description,
    canonical,
    keywords: `${pb.keyword}, THE SIGNAL, 1Commerce LLC, commerce systems, AI agents`,
    jsonLd: [article, faqPage, breadcrumbs],
  })}
${HEADER}
<main id="main" class="daily-wrap">
  <p class="daily-kicker">Playbook · ${escapeHtml(pb.keyword)} · updated ${pb.updated}</p>
  <h1 class="daily-title">${escapeHtml(pb.title)}</h1>
  <p class="daily-dek">${escapeHtml(pb.dek)}</p>
  <p class="daily-meta">${pb.readMinutes} min read · <a href="./">All playbooks</a> · <a href="../fieldnotes/">Fieldnotes</a> · <a href="../archive/">Archive</a></p>

${pb.intro.map((p) => `  <p class="playbook-intro">${escapeHtml(p)}</p>`).join('\n')}

${sectionsHtml}

  <section class="daily-summary" aria-labelledby="pb-checklist">
    <h2 id="pb-checklist">The checklist</h2>
    <ul class="daily-takeaways">
${pb.checklist.map((c) => `      <li>${escapeHtml(c)}</li>`).join('\n')}
    </ul>
  </section>

  <section class="daily-section">
    <h2>Signals that it is working</h2>
    <ul class="daily-prompts">
${pb.signals.map((s) => `      <li>${escapeHtml(s)}</li>`).join('\n')}
    </ul>
  </section>

  <section class="daily-section playbook-faq" aria-labelledby="pb-faq">
    <h2 id="pb-faq">Frequently asked</h2>
${faqHtml}
  </section>

  <section class="daily-section">
    <h2>Related playbooks</h2>
    <ul class="daily-prompts">
${relatedHtml}
    </ul>
  </section>

  <aside class="daily-standard">
    <strong>Editorial standard:</strong> This playbook is evergreen and maintained by hand. It consolidates what the <a href="../daily/">daily briefs</a> cover in passing, so there is one page per idea rather than one page per day.
  </aside>
</main>
${FOOTER}
${SCRIPTS}`;
}

function indexPage() {
  const canonical = `${SITE_URL}/playbooks/`;

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'THE SIGNAL — Operator Playbooks',
    itemListElement: playbooks.map((pb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: pb.title,
      url: `${SITE_URL}/playbooks/${pb.slug}.html`,
    })),
  };

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'THE SIGNAL', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Playbooks', item: canonical },
    ],
  };

  const cards = playbooks
    .map(
      (pb) => `    <article class="playbook-card">
      <p class="mono-label">${escapeHtml(pb.keyword)}</p>
      <h2><a href="./${pb.slug}.html">${escapeHtml(pb.title)}</a></h2>
      <p>${escapeHtml(pb.dek)}</p>
      <p class="daily-meta">${pb.readMinutes} min read · updated ${pb.updated}</p>
    </article>`,
    )
    .join('\n');

  return `${head({
    title: 'Operator Playbooks — THE SIGNAL | Commerce systems, agents & validation',
    description:
      'Seven evergreen operator playbooks from 1Commerce LLC: AI commerce operations, build-in-public systems, the solo founder stack, agent revenue workflows, commerce intelligence, automated SEO, and product validation.',
    canonical,
    keywords: 'operator playbooks, AI commerce operations, solo founder tech stack, product validation systems',
    jsonLd: [itemList, breadcrumbs],
  })}
${HEADER}
<main id="main" class="daily-wrap">
  <p class="daily-kicker">Playbooks · evergreen · maintained by hand</p>
  <h1 class="daily-title">Operator Playbooks</h1>
  <p class="daily-dek">The durable version of what THE SIGNAL covers daily — one page per idea, written once and kept current.</p>
  <p class="daily-meta">${playbooks.length} playbooks · <a href="../archive/">Weekly dispatches</a> · <a href="../fieldnotes/">Fieldnotes</a> · <a href="../daily/">Daily briefs</a></p>

  <div class="playbook-grid">
${cards}
  </div>
</main>
${FOOTER}
${SCRIPTS}`;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  for (const pb of playbooks) {
    const others = playbooks.filter((o) => o.slug !== pb.slug);
    await writeFile(path.join(OUT_DIR, `${pb.slug}.html`), playbookPage(pb, others));
  }
  await writeFile(path.join(OUT_DIR, 'index.html'), indexPage());

  console.log(`Built ${playbooks.length} playbooks + index into /playbooks/.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
