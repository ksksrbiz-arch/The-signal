/**
 * site-chrome.mjs — canonical THE SIGNAL page chrome (single source of truth)
 * ---------------------------------------------------------------------------
 * The site's header / mobile-nav / footer are otherwise copy-pasted into every
 * static page. This module is the programmatic source of truth used by the
 * generators (the /blog hub, the Markdown authoring pipeline) so everything they
 * emit carries identical, canonical chrome and the one canonical nav.
 *
 * The daily-content-agent has its own in-file copy of this markup; keep the two
 * in sync (or migrate the agent to import this) when the nav changes.
 *
 * Nav is depth-relative: pass `prefix` for how deep the page sits ('../' for a
 * one-level-deep section like /blog/ or /daily/), and `active` to mark the
 * current section (its link becomes './' with aria-current).
 */

// [label, path-relative-to-site-root]
export const NAV_ITEMS = [
  ['Home', ''],
  ['Archive', 'archive/'],
  ['Fieldnotes', 'fieldnotes/'],
  ['Verified Builds', 'builds/'],
  ['News Aggregator', 'news/'],
  ['Videos', 'videos/'],
  ['Reel Engine', 'reel-engine/'],
  ['Daily', 'daily/'],
  ['About', 'about/'],
  ['Subscribe', '#subscribe'],
];

function hrefFor(label, sectionPath, prefix, active) {
  if (label === 'Subscribe') return '/#subscribe';
  if (label === active) return './';
  if (label === 'Home') return prefix || './';
  return prefix + sectionPath;
}

function activeAttr(label, active) {
  return label === active ? ' class="active" aria-current="page"' : '';
}

/**
 * Build the header + footer HTML strings for a page.
 * @param {{prefix?: string, active?: string}} opts
 * @returns {{header: string, footer: string}}
 */
export function buildChrome({ prefix = '../', active = '' } = {}) {
  const navLinksHtml = NAV_ITEMS.map(
    ([label, p]) => `            <li><a href="${hrefFor(label, p, prefix, active)}"${activeAttr(label, active)}>${label}</a></li>`,
  ).join('\n');

  const mobileLinksHtml = NAV_ITEMS.map(
    ([label, p]) => `    <a href="${hrefFor(label, p, prefix, active)}"${activeAttr(label, active)}>${label}</a>`,
  ).join('\n');

  const footerNavHtml = NAV_ITEMS.map(
    ([label, p]) => `          <li><a href="${hrefFor(label, p, prefix, active)}">${label}</a></li>`,
  ).join('\n');

  const header = `  <div class="grain" aria-hidden="true"></div>

  <div class="mobile-nav" aria-label="Mobile navigation">
    <button class="mobile-nav-close" aria-label="Close menu">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>
${mobileLinksHtml}
  </div>

  <header class="site-header">
    <div class="header-inner">
      <div class="header-left">
        <a href="${prefix || './'}">
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

  const footer = `  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-col">
        <h4>The Signal</h4>
        <p>Systems atlas. Proof-first. No placeholders.</p>
        <form class="subscribe-form" action="https://assets.mailerlite.com/jsonp/887036/forms/131950373498498498/subscribe" method="POST">
          <input type="email" name="fields[email]" placeholder="your@email.com" required aria-label="Email address">
          <button type="submit">Subscribe</button>
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

  return { header, footer };
}
