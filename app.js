/* ============================================================
   THE SIGNAL — Platform Logic v2
   Dark. Gothic. Precise. Now with signal.
   ============================================================ */

// ─── THEME TOGGLE ───────────────────────────────────────────
(function(){
  const t = document.querySelector('[data-theme-toggle]');
  const r = document.documentElement;
  var stored = document.cookie.split('; ').find(function(c){ return c.startsWith('signal-theme='); });
  let d = (stored ? stored.split('=')[1] : '') || r.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
  r.setAttribute('data-theme', d);
  updateIcon();

  if (t) {
    t.addEventListener('click', function() {
      d = d === 'dark' ? 'light' : 'dark';
      r.setAttribute('data-theme', d);
      document.cookie = 'signal-theme=' + d + ';path=/;max-age=31536000';
      t.setAttribute('aria-label', 'Switch to ' + (d === 'dark' ? 'light' : 'dark') + ' mode');
      updateIcon();
    });
  }

  function updateIcon() {
    if (!t) return;
    t.innerHTML = d === 'dark'
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }
})();

// ─── MOBILE NAV ─────────────────────────────────────────────
(function(){
  var toggle = document.querySelector('.nav-toggle');
  var mobileNav = document.querySelector('.mobile-nav');
  var closeBtn = document.querySelector('.mobile-nav-close');
  if (!toggle || !mobileNav) return;
  toggle.addEventListener('click', function() { mobileNav.classList.add('open'); document.body.style.overflow = 'hidden'; });
  function closeMobileNav() { mobileNav.classList.remove('open'); document.body.style.overflow = ''; }
  if (closeBtn) closeBtn.addEventListener('click', closeMobileNav);
  mobileNav.querySelectorAll('a').forEach(function(link) { link.addEventListener('click', closeMobileNav); });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && mobileNav.classList.contains('open')) closeMobileNav(); });
})();

// ─── SCROLL REVEAL ──────────────────────────────────────────
(function(){
  var selectors = '.dispatch, .quote-block, .entity-card, .status-bar, .value-section, .latest-issue, .subscribe-section, .social-proof, .properties-section, .archive-section, .about-section, .about-block, .cta-block, .archive-card, .value-card, .property-card, .pricing-card, .cathedral-phase, .fn-card, .fnplus-doc, .fnplus-week-group';
  var els = document.querySelectorAll(selectors);
  els.forEach(function(el) { el.classList.add('reveal'); });
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    });
  }, { threshold: 0.06, rootMargin: '0px 0px -24px 0px' });
  els.forEach(function(el) { observer.observe(el); });
})();

// ─── READING PROGRESS BAR ───────────────────────────────────
(function(){
  var article = document.querySelector('article.dispatch, .fnplus-hero');
  if (!article) return;
  var bar = document.createElement('div');
  bar.className = 'reading-progress-bar';
  document.body.appendChild(bar);
  function updateProgress() {
    var scrollTop = window.scrollY;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    var progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = Math.min(progress, 100) + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();
})();

// ─── SHARE SYSTEM ───────────────────────────────────────────
(function(){
  var pageUrl = window.location.href;
  var pageTitle = document.title;

  // Build share URLs
  function getShareUrls(url, text) {
    var encoded = encodeURIComponent(url);
    var encodedText = encodeURIComponent(text || pageTitle);
    return {
      x: 'https://x.com/intent/tweet?text=' + encodedText + '&url=' + encoded,
      linkedin: 'https://www.linkedin.com/sharing/share-offsite/?url=' + encoded,
      whatsapp: 'https://wa.me/?text=' + encodedText + '%20' + encoded,
      copy: url
    };
  }

  // Open share window
  function openShare(url) {
    window.open(url, '_blank', 'width=600,height=500,noopener,noreferrer');
  }

  // Copy to clipboard with feedback
  function copyToClipboard(text, btn) {
    navigator.clipboard.writeText(text).then(function() {
      var orig = btn.innerHTML;
      btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>';
      btn.classList.add('copied');
      setTimeout(function() { btn.innerHTML = orig; btn.classList.remove('copied'); }, 2000);
    }).catch(function() {
      // Fallback
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      var orig = btn.innerHTML;
      btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg>';
      btn.classList.add('copied');
      setTimeout(function() { btn.innerHTML = orig; btn.classList.remove('copied'); }, 2000);
    });
  }

  // Inject share strip into all share-strip containers
  function buildShareStrip(container, customUrl, customText) {
    var url = customUrl || pageUrl;
    var text = customText || pageTitle;
    var urls = getShareUrls(url, text);
    container.innerHTML = [
      '<span class="share-label">SHARE</span>',
      '<a class="share-btn share-btn--x" href="' + urls.x + '" target="_blank" rel="noopener noreferrer" aria-label="Share on X" title="Share on X">',
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.73-8.835L1.254 2.25H8.08l4.261 5.633L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
      '</a>',
      '<a class="share-btn share-btn--li" href="' + urls.linkedin + '" target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn" title="Share on LinkedIn">',
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
      '</a>',
      '<a class="share-btn share-btn--wa" href="' + urls.whatsapp + '" target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp" title="Share on WhatsApp">',
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>',
      '</a>',
      '<button class="share-btn share-btn--copy" aria-label="Copy link" title="Copy link" data-copy-url="' + url + '">',
        '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
      '</button>'
    ].join('');

    container.querySelector('.share-btn--copy').addEventListener('click', function() {
      copyToClipboard(this.dataset.copyUrl, this);
    });
    container.querySelectorAll('.share-btn--x, .share-btn--li, .share-btn--wa').forEach(function(a) {
      a.addEventListener('click', function(e) { e.preventDefault(); openShare(this.href); });
    });
  }

  // Init all share strip containers (.share-strip, .share-strip-buttons, [data-share-strip])
  document.querySelectorAll('.share-strip, .share-strip-buttons, [data-share-strip]').forEach(function(strip) {
    var url = strip.dataset.url || pageUrl;
    var text = strip.dataset.text || pageTitle;
    buildShareStrip(strip, url, text);
  });

  // Make globally available
  window.SignalShare = { build: buildShareStrip, copy: copyToClipboard };
})();

// ─── TEXT SELECTION SHARE TOOLTIP ───────────────────────────
(function(){
  var article = document.querySelector('.dispatch-inner');
  if (!article) return;

  var tooltip = document.createElement('div');
  tooltip.className = 'selection-tooltip';
  tooltip.innerHTML = [
    '<span class="selection-tooltip-label">Share this</span>',
    '<button class="sel-btn sel-btn--x" aria-label="Tweet this">',
      '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.73-8.835L1.254 2.25H8.08l4.261 5.633L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
      ' X',
    '</button>',
    '<button class="sel-btn sel-btn--copy" aria-label="Copy quote">',
      '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
      ' Copy',
    '</button>'
  ].join('');
  document.body.appendChild(tooltip);

  var hideTimer;

  document.addEventListener('mouseup', function(e) {
    clearTimeout(hideTimer);
    setTimeout(function() {
      var sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.toString().trim().length < 20) {
        tooltip.classList.remove('visible');
        return;
      }
      // Only show inside article
      var range = sel.getRangeAt(0);
      if (!article.contains(range.commonAncestorContainer)) {
        tooltip.classList.remove('visible');
        return;
      }
      var rect = range.getBoundingClientRect();
      var text = sel.toString().trim().substring(0, 200);
      var shareText = '"' + text + '" — The Signal by 1Commerce LLC';
      var tweetUrl = 'https://x.com/intent/tweet?text=' + encodeURIComponent(shareText) + '&url=' + encodeURIComponent(window.location.href);

      tooltip.querySelector('.sel-btn--x').onclick = function() {
        window.open(tweetUrl, '_blank', 'width=600,height=500,noopener,noreferrer');
        sel.removeAllRanges();
        tooltip.classList.remove('visible');
      };
      tooltip.querySelector('.sel-btn--copy').onclick = function() {
        navigator.clipboard.writeText(shareText).catch(function() {});
        sel.removeAllRanges();
        tooltip.classList.remove('visible');
      };

      var x = rect.left + window.scrollX + (rect.width / 2);
      var y = rect.top + window.scrollY - 8;
      tooltip.style.left = Math.max(10, x - tooltip.offsetWidth / 2) + 'px';
      tooltip.style.top = y + 'px';
      tooltip.classList.add('visible');
    }, 10);
  });

  document.addEventListener('mousedown', function() {
    hideTimer = setTimeout(function() { tooltip.classList.remove('visible'); }, 150);
  });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') tooltip.classList.remove('visible'); });
})();

// ─── REACTION SYSTEM ────────────────────────────────────────
(function(){
  var reactions = document.querySelectorAll('.reaction-bar');
  if (!reactions.length) return;

  reactions.forEach(function(bar) {
    var pageKey = 'signal-reactions-' + btoa(window.location.pathname).replace(/=/g,'');

    // Get stored state
    var stored = {};
    try { stored = JSON.parse(localStorage.getItem(pageKey) || '{}'); } catch(e){}

    bar.querySelectorAll('.reaction-btn').forEach(function(btn) {
      var key = btn.dataset.reaction;
      var count = parseInt(btn.dataset.count || '0') + (stored[key] || 0);
      btn.querySelector('.reaction-count').textContent = count;
      if (stored[key]) btn.classList.add('reacted');

      btn.addEventListener('click', function() {
        if (btn.classList.contains('reacted')) return; // one reaction per session
        // Mark all in same bar as unavailable
        if (bar.dataset.exclusive !== 'false') {
          bar.querySelectorAll('.reaction-btn').forEach(function(b) { b.classList.add('reacted'); });
        }
        btn.classList.add('reacted', 'just-reacted');
        var newCount = parseInt(btn.querySelector('.reaction-count').textContent) + 1;
        btn.querySelector('.reaction-count').textContent = newCount;
        stored[key] = (stored[key] || 0) + 1;
        try { localStorage.setItem(pageKey, JSON.stringify(stored)); } catch(e){}
        setTimeout(function() { btn.classList.remove('just-reacted'); }, 600);
      });
    });
  });
})();

// ─── TABLE OF CONTENTS ──────────────────────────────────────
(function(){
  var toc = document.querySelector('.article-toc');
  var article = document.querySelector('.dispatch-inner');
  if (!toc || !article) return;

  var headings = article.querySelectorAll('h2.feature-title');
  if (headings.length < 2) { toc.style.display = 'none'; return; }

  var list = toc.querySelector('.toc-list') || document.createElement('ul');
  list.className = 'toc-list';

  headings.forEach(function(h, i) {
    if (!h.id) h.id = 'section-' + i;
    var li = document.createElement('li');
    var a = document.createElement('a');
    a.href = '#' + h.id;
    a.textContent = h.textContent;
    a.className = 'toc-link';
    li.appendChild(a);
    list.appendChild(li);
  });
  toc.appendChild(list);

  // Highlight active section on scroll
  var tocLinks = toc.querySelectorAll('.toc-link');
  function updateTocActive() {
    var scrollPos = window.scrollY + 120;
    var activeSet = false;
    for (var i = headings.length - 1; i >= 0; i--) {
      if (headings[i].offsetTop <= scrollPos) {
        tocLinks.forEach(function(a) { a.classList.remove('active'); });
        if (tocLinks[i]) tocLinks[i].classList.add('active');
        activeSet = true;
        break;
      }
    }
    if (!activeSet && tocLinks[0]) { tocLinks.forEach(function(a) { a.classList.remove('active'); }); tocLinks[0].classList.add('active'); }
  }
  window.addEventListener('scroll', updateTocActive, { passive: true });
  updateTocActive();
})();

// ─── CARD SHIMMER / MICRO-INTERACTIONS ──────────────────────
(function(){
  // Add shimmer sweep on hover for archive cards and fn-cards
  var cards = document.querySelectorAll('.archive-card, .fn-card, .fnplus-doc, .property-card, .value-card');
  cards.forEach(function(card) {
    card.addEventListener('mousemove', function(e) {
      var rect = card.getBoundingClientRect();
      var x = ((e.clientX - rect.left) / rect.width) * 100;
      var y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--shimmer-x', x + '%');
      card.style.setProperty('--shimmer-y', y + '%');
    });
    card.addEventListener('mouseleave', function() {
      card.style.removeProperty('--shimmer-x');
      card.style.removeProperty('--shimmer-y');
    });
  });
})();

// ─── SUBSCRIBE FORM ─────────────────────────────────────────
(function(){
  var forms = document.querySelectorAll('.subscribe-form, .footer-subscribe-form');
  forms.forEach(function(form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var emailInput = form.querySelector('input[type="email"]');
      var submitBtn = form.querySelector('button[type="submit"]');
      var email = emailInput ? emailInput.value.trim() : '';
      if (!email || !email.includes('@')) return;
      var originalText = submitBtn.textContent;
      submitBtn.textContent = 'SENDING...';
      submitBtn.disabled = true;
      var cbName = 'mlCallback' + Date.now();
      window[cbName] = function() {
        submitBtn.textContent = 'SUBSCRIBED ✓';
        emailInput.value = '';
        setTimeout(function() { submitBtn.textContent = originalText; submitBtn.disabled = false; }, 3000);
        delete window[cbName];
      };
      setTimeout(function() {
        if (submitBtn.textContent === 'SENDING...') {
          submitBtn.textContent = 'SUBSCRIBED ✓';
          emailInput.value = '';
          setTimeout(function() { submitBtn.textContent = originalText; submitBtn.disabled = false; }, 3000);
        }
      }, 3000);
      var script = document.createElement('script');
      script.src = 'https://assets.mailerlite.com/jsonp/887036/forms/131950373498498498/subscribe?fields[email]=' + encodeURIComponent(email) + '&callback=' + cbName;
      document.head.appendChild(script);
    });
  });
})();

// ─── FILTER BUTTONS (Fieldnotes+) ───────────────────────────
(function(){
  var btns = document.querySelectorAll('.fnplus-filter-btn');
  if (!btns.length) return;
  btns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      btns.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      // Future: filter grid by data-category
    });
  });
})();
