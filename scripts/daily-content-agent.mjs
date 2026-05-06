import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_URL = 'https://1commercesolutions.com';
const DAILY_DIR = path.join(ROOT, 'daily');
const DATA_DIR = path.join(ROOT, 'data');
const TODAY = process.env.SIGNAL_DATE || new Date().toISOString().slice(0, 10);

const topics = [
  {
    theme: 'AI-native commerce operations',
    keyword: 'AI commerce operations',
    angle: 'What an operator should automate today without losing human judgment.',
  },
  {
    theme: 'proof-first founder systems',
    keyword: 'build in public systems',
    angle: 'How to turn shipping evidence into trust, distribution, and compounding momentum.',
  },
  {
    theme: 'solo-founder infrastructure',
    keyword: 'solo founder tech stack',
    angle: 'Where leverage comes from when headcount stays intentionally small.',
  },
  {
    theme: 'agent workflows for revenue',
    keyword: 'AI agent revenue workflows',
    angle: 'How agents support prospecting, qualification, follow-up, and post-sale delivery.',
  },
  {
    theme: 'commerce intelligence layers',
    keyword: 'commerce intelligence layer',
    angle: 'Why storefronts need memory, context, and action layers beyond static pages.',
  },
  {
    theme: 'operator SEO discipline',
    keyword: 'automated SEO for static sites',
    angle: 'The daily habits that keep crawl signals fresh without chasing gimmicks.',
  },
  {
    theme: 'validated product experiments',
    keyword: 'product validation systems',
    angle: 'How to move from idea to shipped proof while keeping scope under control.',
  },
];

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function safeJsonLd(value) {
  return JSON.stringify(value, null, 2).replaceAll('<', '\\u003c');
}

function pickTopic(date) {
  const dayNumber = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  return topics[dayNumber % topics.length];
}

function fallbackBrief(date) {
  const topic = pickTopic(date);
  return {
    title: `Daily Signal: ${topic.theme}`,
    description: `${topic.angle} A concise operating brief from THE SIGNAL for ${date}.`,
    keyword: topic.keyword,
    thesis: topic.angle,
    sections: [
      {
        heading: 'The operating signal',
        body: `Today's focus is ${topic.keyword}: the practical work of turning attention into a durable system. The goal is not more noise. The goal is a clearer loop between what shipped, what the market noticed, and what deserves the next hour of execution.`,
      },
      {
        heading: 'What to inspect',
        body: 'Review the newest proof points, stale pages, repeated questions, and any workflow that still depends on memory instead of a repeatable checklist. If the same decision is made twice, it is a candidate for a system.',
      },
      {
        heading: 'Action for the day',
        body: 'Publish one useful artifact, improve one crawl signal, and capture one operational lesson. Small daily updates compound better than occasional rebuilds because search engines and readers both reward fresh, specific evidence.',
      },
    ],
    prompts: [
      `What changed in ${topic.keyword} this week that an operator can act on?`,
      'Which page on The Signal deserves a stronger title, description, or internal link?',
      "What shipped proof can become tomorrow's fieldnote, build log, or short video?",
    ],
  };
}

async function aiBrief(date) {
  if (!process.env.OPENAI_API_KEY) return null;

  const topic = pickTopic(date);
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.65,
      messages: [
        {
          role: 'system',
          content:
            'You write concise, original operating briefs for THE SIGNAL by 1Commerce LLC. Return only valid JSON with title, description, keyword, thesis, sections[{heading,body}], prompts[]. Do not invent news, stats, names, or sources.',
        },
        {
          role: 'user',
          content: `Create the daily brief for ${date}. Theme: ${topic.theme}. Keyword: ${topic.keyword}. Angle: ${topic.angle}. Keep sections practical, evergreen, and under 90 words each.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    const detail = [response.status, response.statusText, errorBody.slice(0, 300)].filter(Boolean).join(' ');
    throw new Error(`OpenAI request failed: ${detail}`);
  }

  const payload = await response.json();
  return JSON.parse(payload.choices?.[0]?.message?.content || '{}');
}

function articleHtml(brief, date) {
  const url = `${SITE_URL}/daily/${date}.html`;
  const safeTitle = escapeHtml(brief.title);
  const safeDescription = escapeHtml(brief.description);
  const safeKeyword = escapeHtml(brief.keyword);
  const safeThesis = escapeHtml(brief.thesis);
  const schema = safeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: brief.title,
    description: brief.description,
    author: { '@type': 'Organization', name: '1Commerce LLC' },
    publisher: { '@type': 'Organization', name: '1Commerce LLC' },
    mainEntityOfPage: url,
    image: `${SITE_URL}/og-image.png`,
    datePublished: date,
    dateModified: date,
  });

  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="index, follow">
<title>${safeTitle} | THE SIGNAL</title>
<meta name="description" content="${safeDescription}">
<meta name="keywords" content="${safeKeyword}, THE SIGNAL, 1Commerce LLC, commerce systems, AI agents">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${safeTitle}">
<meta property="og:description" content="${safeDescription}">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="THE SIGNAL">
<meta property="og:image" content="${SITE_URL}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${safeTitle}">
<meta name="twitter:description" content="${safeDescription}">
<meta name="twitter:image" content="${SITE_URL}/og-image.png">
<meta name="author" content="1Commerce LLC">
<meta name="theme-color" content="#E8B86A">
<link rel="icon" type="image/svg+xml" href="/assets/brand/favicon.svg">
<link rel="stylesheet" href="../base.css?v=20260502a">
<link rel="stylesheet" href="../style.css?v=20260502a">
<script type="application/ld+json">
${schema}
</script>
<style>
.daily-wrap{max-width:840px;margin:0 auto;padding:clamp(56px,8vw,96px) 24px}
.daily-kicker{font-family:var(--font-mono);font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--verified);margin-bottom:16px}
.daily-title{font-family:var(--font-display);font-size:clamp(2.4rem,7vw,4.4rem);line-height:1.04;margin:0 0 18px;color:var(--text)}
.daily-dek{font-family:var(--font-display);font-size:clamp(1.1rem,2vw,1.35rem);line-height:1.55;color:#DFD3BA;margin:0 0 32px}
.daily-meta,.daily-prompts li{font-family:var(--font-mono);font-size:12px;color:var(--faint)}
.daily-section{border-top:1px solid var(--rule);padding-top:28px;margin-top:32px}
.daily-section h2{font-family:var(--font-display);font-size:1.6rem;color:var(--text);margin:0 0 12px}
.daily-section p{font-size:18px;line-height:1.75;color:var(--muted)}
.daily-prompts{padding-left:20px;line-height:1.7}
</style>
</head>
<body>
<a href="#main" class="skip-link">Skip to main content</a>
<main id="main" class="daily-wrap">
  <p class="daily-kicker">Daily Signal · ${escapeHtml(date)} · ${safeKeyword}</p>
  <h1 class="daily-title">${safeTitle}</h1>
  <p class="daily-dek">${safeThesis}</p>
  <p class="daily-meta"><a href="./">Daily index</a> · <a href="../fieldnotes/">Fieldnotes</a> · <a href="../">Home</a></p>
  ${brief.sections
    .map(
      (section) => `<section class="daily-section">
    <h2>${escapeHtml(section.heading)}</h2>
    <p>${escapeHtml(section.body)}</p>
  </section>`,
    )
    .join('\n')}
  <section class="daily-section">
    <h2>Agent prompts</h2>
    <ul class="daily-prompts">
      ${brief.prompts.map((prompt) => `<li>${escapeHtml(prompt)}</li>`).join('\n      ')}
    </ul>
  </section>
</main>
</body>
</html>
`;
}

async function pageSummary(file) {
  const html = await readFile(path.join(DAILY_DIR, file), 'utf8');
  return {
    file,
    date: file.replace('.html', ''),
    title: html.match(/<h1 class="daily-title">([^<]+)<\/h1>/)?.[1] || file,
    description: html.match(/<meta name="description" content="([^"]+)">/)?.[1] || '',
  };
}

async function writeIndex() {
  const files = (await readdir(DAILY_DIR)).filter((file) => /^\d{4}-\d{2}-\d{2}\.html$/.test(file)).sort().reverse();
  const pages = await Promise.all(files.map(pageSummary));
  const cards = pages
    .map(
      (page) => `<a class="daily-card" href="./${escapeHtml(page.file)}">
  <span>${escapeHtml(page.date)}</span>
  <strong>${escapeHtml(page.title)}</strong>
  <em>${escapeHtml(page.description)}</em>
</a>`,
    )
    .join('\n');

  await writeFile(
    path.join(DAILY_DIR, 'index.html'),
    `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="index, follow">
<title>Daily Signal — THE SIGNAL</title>
<meta name="description" content="Daily SEO and content operating briefs generated for THE SIGNAL by 1Commerce LLC.">
<link rel="canonical" href="${SITE_URL}/daily/">
<meta property="og:title" content="Daily Signal — THE SIGNAL">
<meta property="og:description" content="Daily SEO and content operating briefs generated for THE SIGNAL.">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE_URL}/daily/">
<meta property="og:image" content="${SITE_URL}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#E8B86A">
<link rel="icon" type="image/svg+xml" href="/assets/brand/favicon.svg">
<link rel="stylesheet" href="../base.css?v=20260502a">
<link rel="stylesheet" href="../style.css?v=20260502a">
<style>
.daily-index{max-width:920px;margin:0 auto;padding:clamp(56px,8vw,96px) 24px}
.daily-index h1{font-family:var(--font-display);font-size:clamp(2.8rem,8vw,4.8rem);margin:0 0 18px;color:var(--text)}
.daily-index p{color:var(--muted);font-size:18px;line-height:1.7;max-width:62ch}
.daily-grid{display:grid;gap:18px;margin-top:36px}
.daily-card{display:grid;gap:8px;padding:22px;border:1px solid var(--rule);background:var(--panel);border-radius:var(--r);text-decoration:none;color:inherit}
.daily-card:hover{border-color:var(--active);background:var(--panel2)}
.daily-card span{font-family:var(--font-mono);font-size:12px;color:var(--verified)}
.daily-card strong{font-family:var(--font-display);font-size:1.35rem;color:var(--text)}
.daily-card em{font-style:normal;color:var(--muted);line-height:1.55}
</style>
</head>
<body>
<main class="daily-index">
  <p><a href="../">Home</a> · <a href="../fieldnotes/">Fieldnotes</a></p>
  <h1>Daily Signal</h1>
  <p>Automated SEO and content operating briefs for keeping THE SIGNAL fresh, specific, and useful every day.</p>
  <div class="daily-grid">
${cards}
  </div>
</main>
</body>
</html>
`,
  );
}

async function updateSitemap(date) {
  const sitemapPath = path.join(ROOT, 'sitemap.xml');
  let xml = await readFile(sitemapPath, 'utf8').catch(() => '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>\n');
  const entries = [
    { loc: `${SITE_URL}/daily/`, changefreq: 'daily', priority: '0.9' },
    { loc: `${SITE_URL}/daily/${date}.html`, changefreq: 'daily', priority: '0.7' },
  ];

  for (const entry of entries) {
    const block = `  <url>\n    <loc>${entry.loc}</loc>\n    <lastmod>${date}</lastmod>\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`;
    const escapedLoc = entry.loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existingEntry = new RegExp(`\\s*<url>\\s*<loc>${escapedLoc}<\\/loc>[\\s\\S]*?<\\/url>`);
    const closingUrlset = /\s*<\/urlset>\s*$/;

    if (existingEntry.test(xml)) {
      xml = xml.replace(existingEntry, `\n${block}`);
    } else {
      xml = xml.replace(closingUrlset, `\n\n${block}\n\n</urlset>\n`);
    }
  }

  await writeFile(sitemapPath, xml);
}

async function main() {
  await mkdir(DAILY_DIR, { recursive: true });
  await mkdir(DATA_DIR, { recursive: true });

  let brief = fallbackBrief(TODAY);
  try {
    brief = (await aiBrief(TODAY)) || brief;
  } catch (error) {
    console.warn(`AI content unavailable; using deterministic brief. ${error.message}`);
  }

  const required = ['title', 'description', 'keyword', 'thesis', 'sections', 'prompts'];
  if (!required.every((key) => brief[key]) || !Array.isArray(brief.sections) || !Array.isArray(brief.prompts)) {
    brief = fallbackBrief(TODAY);
  }

  const outputPath = path.join(DAILY_DIR, `${TODAY}.html`);
  await writeFile(outputPath, articleHtml(brief, TODAY));
  await writeIndex();
  await writeFile(path.join(DATA_DIR, 'latest-daily-signal.json'), `${JSON.stringify({ date: TODAY, ...brief }, null, 2)}\n`);
  await updateSitemap(TODAY);

  const { size } = await stat(outputPath);
  console.log(`Generated ${path.relative(ROOT, outputPath)} (${size} bytes)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
