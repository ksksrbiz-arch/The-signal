import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_URL = 'https://1commercesolutions.com';
const DAILY_DIR = path.join(ROOT, 'daily');
const DATA_DIR = path.join(ROOT, 'data');
const TODAY = process.env.SIGNAL_DATE || new Date().toISOString().slice(0, 10);
const AI_TEMPERATURE = 0.65;
const READING_WORDS_PER_MINUTE = 220;
const MIN_TITLE_LENGTH = 18;
const MIN_DESCRIPTION_LENGTH = 110;
const MIN_THESIS_LENGTH = 45;
const MIN_TAKEAWAYS = 3;
const MIN_SECTIONS = 5;
const MIN_PROMPTS = 3;
const MIN_SECTION_WORDS = 180;

const topics = [
  {
    theme: 'AI-native commerce operations',
    keyword: 'AI commerce operations',
    angle: 'What an operator should automate today without losing human judgment.',
    context:
      'Commerce teams are being pushed to add agents before they have clean handoffs, decision logs, or QA loops. The winning move is to automate the repeatable edge of the work while keeping pricing, positioning, and customer empathy under human control.',
    operatorMoves: [
      'List one workflow where the same decision is made at least three times a week.',
      'Write the acceptance criteria before asking an agent to draft, route, or publish anything.',
      'Keep a human review step for claims, pricing, refunds, and customer-facing commitments.',
    ],
    qualitySignals: ['Lower response latency', 'fewer repeated manual checks', 'clearer ownership when an agent output is wrong'],
    contentAngles: ['agent workflow teardown', 'before/after operations note', 'AI automation checklist'],
  },
  {
    theme: 'proof-first founder systems',
    keyword: 'build in public systems',
    angle: 'How to turn shipping evidence into trust, distribution, and compounding momentum.',
    context:
      'Build-in-public only works when the public record proves actual movement. Screenshots, deploy links, changelogs, and customer lessons beat vague momentum posts because they show the difference between intention and shipped infrastructure.',
    operatorMoves: [
      'Capture one artifact from every shipped change: link, screenshot, metric, or decision note.',
      'Tie each update to a customer problem instead of only describing the builder activity.',
      'Archive the proof in a page that can be crawled, shared, and referenced later.',
    ],
    qualitySignals: ['more internal links to shipped work', 'clearer weekly narrative', 'fewer unsupported claims'],
    contentAngles: ['weekly proof ledger', 'build log', 'trust asset teardown'],
  },
  {
    theme: 'solo-founder infrastructure',
    keyword: 'solo founder tech stack',
    angle: 'Where leverage comes from when headcount stays intentionally small.',
    context:
      'A solo-founder stack is not a trophy shelf of tools. It is a set of defaults that protects attention, reduces context switching, and makes the next customer-visible improvement cheaper to ship.',
    operatorMoves: [
      'Identify one tool that creates more coordination work than leverage.',
      'Move recurring setup steps into a checklist, script, template, or saved view.',
      'Keep the stack boring where reliability matters and experimental where learning matters.',
    ],
    qualitySignals: ['fewer open loops', 'shorter path from idea to deploy', 'lower monthly tool waste'],
    contentAngles: ['tool audit', 'solo operator playbook', 'cost-to-leverage breakdown'],
  },
  {
    theme: 'agent workflows for revenue',
    keyword: 'AI agent revenue workflows',
    angle: 'How agents support prospecting, qualification, follow-up, and post-sale delivery.',
    context:
      'Revenue agents should not replace judgment; they should remove the dead air between signal and follow-up. The best workflows enrich context, draft next steps, and surface timing cues while leaving strategic decisions visible.',
    operatorMoves: [
      'Define the trigger that starts the workflow and the evidence that stops it.',
      'Separate research, drafting, sending, and logging into auditable steps.',
      'Measure whether the workflow improves quality of follow-up, not just message volume.',
    ],
    qualitySignals: ['better-qualified replies', 'consistent follow-up timing', 'clean CRM or inbox history'],
    contentAngles: ['workflow map', 'prompt-to-pipeline note', 'revenue operations fieldnote'],
  },
  {
    theme: 'commerce intelligence layers',
    keyword: 'commerce intelligence layer',
    angle: 'Why storefronts need memory, context, and action layers beyond static pages.',
    context:
      'Modern storefronts need to remember intent across sessions, products, campaigns, and support moments. The intelligence layer is the connective tissue that turns a page view into a useful next action.',
    operatorMoves: [
      'Map the customer questions that appear before purchase, during fulfillment, and after delivery.',
      'Connect content, product data, and support context before adding new interface polish.',
      'Design for explicit handoff when the system lacks confidence.',
    ],
    qualitySignals: ['fewer dead-end visits', 'more relevant internal paths', 'clearer support-to-sales feedback'],
    contentAngles: ['architecture note', 'customer journey memo', 'commerce AI explainer'],
  },
  {
    theme: 'operator SEO discipline',
    keyword: 'automated SEO for static sites',
    angle: 'The daily habits that keep crawl signals fresh without chasing gimmicks.',
    context:
      'Useful SEO automation is mostly discipline: titles that match intent, descriptions that explain value, internal links that form a map, and sitemaps that reflect what actually exists.',
    operatorMoves: [
      'Check that every new page has one clear search intent and one canonical URL.',
      'Refresh the sitemap after content changes instead of treating it as a static file.',
      'Improve one thin page with a stronger summary, internal link, or proof artifact.',
    ],
    qualitySignals: ['zero missing metadata issues', 'fresh sitemap entries', 'clearer page summaries'],
    contentAngles: ['SEO maintenance log', 'static-site checklist', 'metadata before/after'],
  },
  {
    theme: 'validated product experiments',
    keyword: 'product validation systems',
    angle: 'How to move from idea to shipped proof while keeping scope under control.',
    context:
      'A validated experiment is not a brainstorm with a landing page. It is a constrained test with a user, a promise, a measurable signal, and a decision rule that prevents endless tinkering.',
    operatorMoves: [
      'Write the smallest promise a real user can understand and respond to.',
      'Set the decision rule before building: continue, change, or kill.',
      'Ship the proof artifact even if the result is negative, because the learning compounds.',
    ],
    qualitySignals: ['shorter test cycles', 'clear pass/fail criteria', 'less scope creep before feedback'],
    contentAngles: ['experiment brief', 'validation scorecard', 'MVP postmortem'],
  },
];

// Canonical site nav (Daily marked active on every daily page). Daily pages are
// one level deep, so section links use ../ and the Daily link points at ./ .
const NAV_ITEMS = [
  ['Home', '../'],
  ['Archive', '../archive/'],
  ['Fieldnotes', '../fieldnotes/'],
  ['Verified Builds', '../builds/'],
  ['News Aggregator', '../news/'],
  ['Videos', '../videos/'],
  ['Reel Engine', '../reel-engine/'],
  ['Daily', './'],
  ['About', '../about/'],
  ['Subscribe', '/#subscribe'],
];

const navLinksHtml = NAV_ITEMS.map(([label, href]) =>
  label === 'Daily'
    ? `            <li><a href="${href}" class="active" aria-current="page">${label}</a></li>`
    : `            <li><a href="${href}">${label}</a></li>`,
).join('\n');

const mobileLinksHtml = NAV_ITEMS.map(([label, href]) =>
  label === 'Daily'
    ? `    <a href="${href}" class="active" aria-current="page">${label}</a>`
    : `    <a href="${href}">${label}</a>`,
).join('\n');

const footerNavHtml = NAV_ITEMS.map(([label, href]) => `          <li><a href="${href}">${label}</a></li>`).join('\n');

const SITE_HEADER = `  <div class="grain" aria-hidden="true"></div>

  <div class="mobile-nav" aria-label="Mobile navigation">
    <button class="mobile-nav-close" aria-label="Close menu">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>
${mobileLinksHtml}
  </div>

  <header class="site-header">
    <div class="header-inner">
      <div class="header-left">
        <a href="../">
          <svg class="logo" viewBox="0 0 32 32" width="28" height="28" fill="none" aria-label="The Signal logo">
            <rect x="2" y="2" width="28" height="28" rx="5" stroke="currentColor" stroke-width="1.25" opacity="0.35"/>
            <line x1="16" y1="5" x2="16" y2="27" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <line x1="9" y1="8" x2="9" y2="24" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" opacity="0.58"/>
            <line x1="23" y1="8" x2="23" y2="24" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" opacity="0.58"/>
            <circle cx="16" cy="16" r="4.2" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <circle cx="16" cy="16" r="1.25" fill="currentColor"/>
            <line x1="4.75" y1="16" x2="11.2" y2="16" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" opacity="0.5"/>
            <line x1="20.8" y1="16" x2="27.25" y2="16" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" opacity="0.5"/>
          </svg>
          <span class="header-title">THE SIGNAL</span>
        </a>
      </div>
      <div class="header-right">
        <nav>
          <ul class="nav-links">
${navLinksHtml}
          </ul>
        </nav>
        <button class="nav-toggle" aria-label="Open menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
        </button>
        <button data-theme-toggle aria-label="Switch to light mode">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
        </button>
      </div>
    </div>
  </header>`;

const SITE_FOOTER = `  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-col">
        <h4>The Signal</h4>
        <p>Systems atlas. Proof-first. No placeholders.</p>
        <form class="subscribe-form">
          <input type="email" name="fields[email]" placeholder="your@email.com" required aria-label="Email address">
          <button type="submit">Subscribe</button>
          <span class="subscribe-msg" aria-live="polite"></span>
        </form>
      </div>
      <div class="footer-col">
        <h4>Navigate</h4>
        <ul>
${footerNavHtml}
        </ul>
      </div>
      <div class="footer-col">
        <h4>Systems</h4>
        <ul>
          <li><a href="https://1commerce.online/" target="_blank" rel="noopener noreferrer">UnifyOne</a></li>
          <li><a href="https://1commercesolutions.com/news/" target="_blank" rel="noopener noreferrer">News Aggregator</a></li>
          <li><a href="https://github.com/ksksrbiz-arch" target="_blank" rel="noopener noreferrer">GitHub Org</a></li>
          <li><a href="https://github.com/ksksrbiz-arch/The-Architecture" target="_blank" rel="noopener noreferrer">Architecture Index</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Contact</h4>
        <p class="text-muted text-sm mb-3">Direct line to Keith for projects, consulting, or collaboration.</p>
        <a href="mailto:skdev@1commerce.online" class="contact-email">skdev@1commerce.online</a>
      </div>
    </div>
    <div class="footer-bottom">
      <div class="footer-bottom-left">
        <span class="mono-label">© 2026 1COMMERCE LLC · CANBY, OREGON</span>
        <span class="mono-label">Systems. Proof. Precision.</span>
        <span class="mono-label" style="opacity: 0.35; display: block; margin-top: 8px;">This site uses one cookie (theme preference). No tracking. No analytics.</span>
      </div>
      <a href="https://app.netlify.com/sites/signal01/deploys" target="_blank" rel="noopener noreferrer" class="netlify-badge" aria-label="Netlify deployment status">
        <img src="https://api.netlify.com/api/v1/badges/31c4764b-f9c4-4531-93ca-b367db629132/deploy-status" alt="Netlify Status" width="114" height="20" loading="lazy" decoding="async" />
      </a>
    </div>
  </footer>`;

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

function diagnosticMessage(error) {
  return String(error?.message || 'unknown error')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[redacted-email]')
    .slice(0, 160);
}

function pickTopic(date) {
  const dayNumber = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
  return topics[dayNumber % topics.length];
}

function articleFor(phrase) {
  return /^[aeiou]/i.test(phrase) ? 'an' : 'a';
}

function humanDate(date) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function humanDateShort(date) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function readingMinutes(brief) {
  const body = [
    brief.title,
    brief.description,
    brief.thesis,
    brief.editorialNote,
    ...(brief.takeaways || []),
    ...(brief.sections || []).flatMap((section) => [section.heading, section.body]),
    ...(brief.prompts || []),
  ].join(' ');
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.ceil(words / READING_WORDS_PER_MINUTE));
}

function fallbackBrief(date) {
  const topic = pickTopic(date);
  return {
    title: `Daily Signal: ${topic.theme}`,
    description: `${topic.angle} A practical daily brief for commerce operators — THE SIGNAL, ${humanDate(date)}.`,
    keyword: topic.keyword,
    thesis: topic.angle,
    editorialNote:
      'This brief is intentionally source-free and evergreen: no invented news, no unsupported market claims, and no metrics that did not come from a measured system.',
    takeaways: [
      `Treat ${topic.keyword} as an operating system problem, not a content calendar slogan.`,
      'Publish concrete proof before polishing the narrative around it.',
      'Use automation to protect judgment, not to flood the site with thin pages.',
    ],
    sections: [
      {
        heading: 'The operating signal',
        body: `${topic.context} The daily content job is to make that reality easier to see: one clear idea, one operational lesson, and one useful next action for a founder or operator reading THE SIGNAL.`,
      },
      {
        heading: 'Why it matters today',
        body: `The risk is not publishing too little; it is publishing copy that looks active while saying nothing specific. Better daily content should sharpen the archive, support internal links, and give readers a practical way to inspect ${topic.keyword} inside their own operation.`,
      },
      {
        heading: 'Operator moves',
        body: topic.operatorMoves.map((move, index) => `${index + 1}. ${move}`).join(' '),
      },
      {
        heading: 'Quality signals to watch',
        body: `A useful brief should leave a trail of improved execution. For this theme, watch for ${topic.qualitySignals.join(', ')}. If those signals do not improve, the content is decoration rather than infrastructure.`,
      },
      {
        heading: 'Content angle to ship next',
        body: `Turn today's note into ${articleFor(topic.contentAngles[0])} ${topic.contentAngles[0]}. Then link it to one existing fieldnote, one archive dispatch, and one current build so the page strengthens the wider site instead of standing alone.`,
      },
    ],
    prompts: [
      `What proof would make this ${topic.keyword} claim believable to a skeptical operator?`,
      'Which existing page should this brief strengthen with a contextual internal link?',
      'What decision should a reader be able to make after two minutes on this page?',
      `Which next asset would create the most durable proof: ${topic.contentAngles.join(', ')}?`,
    ],
  };
}

function parseAiJson(content) {
  const trimmed = String(content || '').trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  try {
    return JSON.parse(fenced ? fenced[1] : trimmed);
  } catch (error) {
    const format = fenced ? 'fenced JSON' : 'raw JSON';
    throw new Error(`AI response was not valid ${format}: ${diagnosticMessage(error)}. Check the AI prompt or model configuration.`);
  }
}

function normalizeBrief(candidate, fallback) {
  const brief = {
    title: String(candidate.title || fallback.title).trim(),
    description: String(candidate.description || fallback.description).trim(),
    keyword: String(candidate.keyword || fallback.keyword).trim(),
    thesis: String(candidate.thesis || fallback.thesis).trim(),
    editorialNote: String(candidate.editorialNote || fallback.editorialNote).trim(),
    takeaways: Array.isArray(candidate.takeaways) ? candidate.takeaways : fallback.takeaways,
    sections: Array.isArray(candidate.sections) ? candidate.sections : fallback.sections,
    prompts: Array.isArray(candidate.prompts) ? candidate.prompts : fallback.prompts,
  };

  brief.takeaways = brief.takeaways.map((item) => String(item).trim()).filter(Boolean).slice(0, 5);
  brief.sections = brief.sections
    .map((section) => ({
      heading: String(section.heading || '').trim(),
      body: String(section.body || '').trim(),
    }))
    .filter((section) => section.heading && section.body)
    .slice(0, 6);
  brief.prompts = brief.prompts.map((prompt) => String(prompt).trim()).filter(Boolean).slice(0, 6);

  const failedChecks = qualityFailures(brief);
  if (failedChecks.length === 0) return brief;

  // Prefer AI content only when it meets the editorial quality gate; otherwise
  // fall back so the daily agent always publishes a complete, useful brief.
  console.warn(`Generated brief failed quality checks (${failedChecks.join(', ')}); using deterministic brief.`);
  return fallback;
}

function qualityFailures(brief) {
  const sectionWords = brief.sections.reduce((total, section) => total + section.body.split(/\s+/).filter(Boolean).length, 0);
  const checks = [
    ['title length', brief.title.length >= MIN_TITLE_LENGTH],
    ['description length', brief.description.length >= MIN_DESCRIPTION_LENGTH],
    ['thesis length', brief.thesis.length >= MIN_THESIS_LENGTH],
    ['takeaway count', brief.takeaways.length >= MIN_TAKEAWAYS],
    ['section count', brief.sections.length >= MIN_SECTIONS],
    ['prompt count', brief.prompts.length >= MIN_PROMPTS],
    ['section word count', sectionWords >= MIN_SECTION_WORDS],
  ];
  return checks.filter(([, passed]) => !passed).map(([name]) => name);
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
      temperature: AI_TEMPERATURE,
      messages: [
        {
          role: 'system',
          content:
            'You write sharp, original operating briefs for THE SIGNAL by 1Commerce LLC. Return only valid JSON with title, description, keyword, thesis, editorialNote, takeaways[], sections[{heading,body}], prompts[]. Do not invent news, stats, names, sources, customers, or results. Prefer practical operator language over hype. Every section must contain a concrete decision, inspection point, or next action.',
        },
        {
          role: 'user',
          content: `Create the daily brief for ${date}. Theme: ${topic.theme}. Keyword: ${topic.keyword}. Angle: ${topic.angle}. Context: ${topic.context} Include 3-5 takeaways, 5 sections, and 4 prompts. Keep sections evergreen, specific, and 60-100 words each.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}. Check the API key, model, and quota.`);
  }

  const payload = await response.json();
  return parseAiJson(payload.choices?.[0]?.message?.content || '{}');
}

function articleHtml(brief, date) {
  const url = `${SITE_URL}/daily/${date}.html`;
  const safeTitle = escapeHtml(brief.title);
  const safeDescription = escapeHtml(brief.description);
  const safeKeyword = escapeHtml(brief.keyword);
  const safeThesis = escapeHtml(brief.thesis);
  const safeEditorialNote = escapeHtml(brief.editorialNote);
  const safeDateShort = escapeHtml(humanDateShort(date));
  const minutes = readingMinutes(brief);
  const schema = safeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: brief.title,
    description: brief.description,
    keywords: brief.keyword,
    author: { '@type': 'Person', name: 'Keith' },
    publisher: { '@type': 'Organization', name: '1Commerce LLC', url: SITE_URL + '/' },
    mainEntityOfPage: url,
    image: `${SITE_URL}/og-image.png`,
    datePublished: date,
    dateModified: date,
  });
  const breadcrumb = safeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Daily Signal', item: `${SITE_URL}/daily/` },
      { '@type': 'ListItem', position: 3, name: date },
    ],
  });

  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<!-- Dated briefs are noindex by design: they are newsletter/feed artifacts that
     rotate a fixed topic set, so indexing them cannibalizes the evergreen
     playbooks at /playbooks/. The /daily/ hub itself stays indexed. -->
<meta name="robots" content="noindex, follow, max-snippet:-1, max-image-preview:large">
<title>${safeTitle} — ${safeDateShort} | THE SIGNAL</title>
<meta name="description" content="${safeDescription}">
<meta name="keywords" content="${safeKeyword}, THE SIGNAL, 1Commerce LLC, commerce systems, AI agents">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${safeTitle}">
<meta property="og:description" content="${safeDescription}">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<meta property="og:site_name" content="THE SIGNAL">
<meta property="og:image" content="${SITE_URL}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${safeTitle} | THE SIGNAL">
<meta property="og:image:type" content="image/png">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${safeTitle}">
<meta name="twitter:description" content="${safeDescription}">
<meta name="twitter:image" content="${SITE_URL}/og-image.png">
<meta name="twitter:image:alt" content="${safeTitle} | THE SIGNAL — 1Commerce LLC">
<meta name="author" content="Keith">
<!-- GEO Targeting -->
<meta name="geo.region" content="US-OR">
<meta name="geo.placename" content="Canby, Oregon">
<meta name="geo.position" content="45.2640;-122.6918">
<meta name="ICBM" content="45.2640, -122.6918">
<meta name="theme-color" content="#E8B86A">
<link rel="icon" type="image/svg+xml" href="/assets/brand/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/brand/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/brand/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">
<link rel="alternate" type="application/rss+xml" title="THE SIGNAL — Daily Signal" href="/feed.xml">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="THE SIGNAL">
<link rel="stylesheet" href="../base.css?v=20260711a">
<link rel="stylesheet" href="../style.css?v=20260711a">
<script type="application/ld+json">
${schema}
</script>
<script type="application/ld+json">
${breadcrumb}
</script>
<style>
.daily-wrap{max-width:840px;margin:0 auto;padding:clamp(56px,8vw,96px) 24px}
.daily-kicker{font-family:var(--font-mono);font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--verified);margin-bottom:16px}
.daily-title{font-family:var(--font-display);font-size:clamp(2.4rem,7vw,4.4rem);line-height:1.04;margin:0 0 18px;color:var(--text)}
.daily-dek{font-family:var(--font-display);font-size:clamp(1.1rem,2vw,1.35rem);line-height:1.55;color:#DFD3BA;margin:0 0 32px}
.daily-meta,.daily-prompts li{font-family:var(--font-mono);font-size:12px;color:var(--faint)}
.daily-summary{display:grid;gap:16px;margin:34px 0;padding:24px;border:1px solid var(--rule);background:var(--panel);border-radius:var(--r)}
.daily-summary h2{font-family:var(--font-mono);font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--verified);margin:0}
.daily-takeaways{margin:0;padding-left:20px;color:var(--muted);line-height:1.7}
.daily-section{border-top:1px solid var(--rule);padding-top:28px;margin-top:32px}
.daily-section h2{font-family:var(--font-display);font-size:1.6rem;color:var(--text);margin:0 0 12px}
.daily-section p{font-size:18px;line-height:1.75;color:var(--muted)}
.daily-standard{margin-top:36px;padding:18px 20px;border-left:3px solid var(--verified);background:rgba(232,184,106,.06);color:var(--muted);line-height:1.65}
.daily-prompts{padding-left:20px;line-height:1.7}
</style>
</head>
<body>
  <a href="#main" class="skip-link">Skip to main content</a>

${SITE_HEADER}

<main id="main" class="daily-wrap">
  <p class="daily-kicker">Daily Signal · ${escapeHtml(date)} · ${safeKeyword}</p>
  <h1 class="daily-title">${safeTitle}</h1>
  <p class="daily-dek">${safeThesis}</p>
  <p class="daily-meta">${minutes} min read · <a href="./">Daily index</a> · <a href="../fieldnotes/">Fieldnotes</a> · <a href="../">Home</a></p>
  <section class="daily-summary" aria-labelledby="brief-takeaways">
    <h2 id="brief-takeaways">What matters</h2>
    <ul class="daily-takeaways">
      ${brief.takeaways.map((takeaway) => `<li>${escapeHtml(takeaway)}</li>`).join('\n      ')}
    </ul>
  </section>
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
  <aside class="daily-standard">
    <strong>Editorial standard:</strong> ${safeEditorialNote}
  </aside>
</main>

${SITE_FOOTER}

  <script src="../app.js" defer></script>
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
<meta property="og:site_name" content="THE SIGNAL">
<meta property="og:image" content="${SITE_URL}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Daily Signal — THE SIGNAL | 1Commerce LLC">
<meta property="og:image:type" content="image/png">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Daily Signal — THE SIGNAL">
<meta name="twitter:description" content="Daily SEO and content operating briefs generated for THE SIGNAL by 1Commerce LLC.">
<meta name="twitter:image" content="${SITE_URL}/og-image.png">
<meta name="twitter:image:alt" content="Daily Signal — THE SIGNAL | 1Commerce LLC">
<meta name="author" content="Keith">
<!-- GEO Targeting -->
<meta name="geo.region" content="US-OR">
<meta name="geo.placename" content="Canby, Oregon">
<meta name="geo.position" content="45.2640;-122.6918">
<meta name="ICBM" content="45.2640, -122.6918">
<meta name="theme-color" content="#E8B86A">
<link rel="icon" type="image/svg+xml" href="/assets/brand/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/assets/brand/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/brand/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">
<link rel="alternate" type="application/rss+xml" title="THE SIGNAL — Daily Signal" href="/feed.xml">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="THE SIGNAL">
<link rel="stylesheet" href="../base.css?v=20260711a">
<link rel="stylesheet" href="../style.css?v=20260711a">
<script type="application/ld+json">
${safeJsonLd({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Daily Signal — THE SIGNAL',
  description: 'Daily SEO and content operating briefs generated for THE SIGNAL by 1Commerce LLC.',
  url: `${SITE_URL}/daily/`,
  isPartOf: { '@type': 'WebSite', name: 'THE SIGNAL', url: `${SITE_URL}/` },
  publisher: { '@type': 'Organization', name: '1Commerce LLC', url: `${SITE_URL}/` },
})}
</script>
<script type="application/ld+json">
${safeJsonLd({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
    { '@type': 'ListItem', position: 2, name: 'Daily Signal' },
  ],
})}
</script>
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
  <a href="#main" class="skip-link">Skip to main content</a>

${SITE_HEADER}

<main id="main" class="daily-index">
  <p><a href="../">Home</a> · <a href="../fieldnotes/">Fieldnotes</a></p>
  <h1>Daily Signal</h1>
  <p>Automated SEO and content operating briefs for keeping THE SIGNAL fresh, specific, and useful every day.</p>
  <div class="daily-grid">
${cards}
  </div>
</main>

${SITE_FOOTER}

  <script src="../app.js" defer></script>
</body>
</html>
`,
  );
}

async function main() {
  await mkdir(DAILY_DIR, { recursive: true });
  await mkdir(DATA_DIR, { recursive: true });

  const fallback = fallbackBrief(TODAY);
  let brief = fallback;
  try {
    brief = normalizeBrief((await aiBrief(TODAY)) || fallback, fallback);
  } catch (error) {
    console.warn(`AI content unavailable or invalid; using deterministic brief. ${diagnosticMessage(error)}`);
  }

  const outputPath = path.join(DAILY_DIR, `${TODAY}.html`);
  await writeFile(outputPath, articleHtml(brief, TODAY));
  await writeIndex();
  await writeFile(path.join(DATA_DIR, 'latest-daily-signal.json'), `${JSON.stringify({ date: TODAY, ...brief }, null, 2)}\n`);

  const { size } = await stat(outputPath);
  console.log(`Generated ${path.relative(ROOT, outputPath)} (${size} bytes)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
