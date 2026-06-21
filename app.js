/* ============================================================
   THE SIGNAL — Platform Logic v3
   Dossier. Blueprint. Precise.
   ============================================================ */

// ─── SERVICE WORKER REGISTRATION ────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').catch(function(err) {
      console.error('SW registration failed:', err);
    });
  });
}

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

  var scrollY = 0;

  function openMobileNav() {
    scrollY = window.scrollY;
    mobileNav.classList.add('active');
    document.body.style.position = 'fixed';
    document.body.style.top = '-' + scrollY + 'px';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
  }

  function closeMobileNav() {
    mobileNav.classList.remove('active');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    window.scrollTo(0, scrollY);
  }

  toggle.addEventListener('click', openMobileNav);
  if (closeBtn) closeBtn.addEventListener('click', closeMobileNav);
  mobileNav.querySelectorAll('a').forEach(function(link) { link.addEventListener('click', closeMobileNav); });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && mobileNav.classList.contains('active')) closeMobileNav(); });

  // Close on click outside
  mobileNav.addEventListener('click', function(e) {
    if (e.target === mobileNav) closeMobileNav();
  });
})();

// ─── SWITCHBOARD SNAP ROUTING ───────────────────────────────
(function(){
  var switchboard = document.querySelector('.switchboard');
  if (!switchboard) return;

  var buttons = switchboard.querySelectorAll('.switchboard-button');
  var views = {
    systems: document.getElementById('systems-view'),
    builds: document.getElementById('builds-view'),
    news: document.getElementById('news-view'),
    docs: document.getElementById('docs-view')
  };

  buttons.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var route = this.dataset.route;
      
      // Update button states
      buttons.forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');

      // Update view visibility
      Object.keys(views).forEach(function(key) {
        if (views[key]) {
          views[key].style.display = key === route ? 'block' : 'none';
        }
      });

      // Snap to view
      if (views[route]) {
        views[route].scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Initialize first view
  if (buttons.length > 0) {
    buttons[0].click();
  }
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

// ─── CONTACT MODAL ──────────────────────────────────────────
(function(){
  var modal = document.getElementById('contact-modal');
  var form = document.getElementById('contact-form');
  var successDiv = document.getElementById('contact-success');
  var errorDiv = document.getElementById('contact-error');
  var errorMessage = document.getElementById('error-message');

  if (!modal || !form) return;

  var scrollY = 0;

  // Open modal
  function openModal() {
    scrollY = window.scrollY;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.position = 'fixed';
    document.body.style.top = '-' + scrollY + 'px';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
  }

  // Close modal
  function closeModal() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    window.scrollTo(0, scrollY);

    // Reset form after animation
    setTimeout(function() {
      form.reset();
      form.style.display = '';
      successDiv.style.display = 'none';
      errorDiv.style.display = 'none';
      var submitBtn = form.querySelector('.contact-submit-btn');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
      }
    }, 300);
  }

  // Open modal on button click
  document.querySelectorAll('[data-contact-modal]').forEach(function(btn) {
    btn.addEventListener('click', openModal);
  });

  // Close modal handlers
  document.querySelectorAll('[data-close-modal]').forEach(function(btn) {
    btn.addEventListener('click', closeModal);
  });

  // Close on escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });

  // Retry on error
  document.querySelectorAll('[data-retry-contact]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      form.style.display = '';
      errorDiv.style.display = 'none';
    });
  });

  // Form submission
  form.addEventListener('submit', function(e) {
    e.preventDefault();

    var submitBtn = form.querySelector('.contact-submit-btn');
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');

    var formData = {
      'form-name': 'contact',
      name: form.querySelector('#contact-name').value,
      email: form.querySelector('#contact-email').value,
      message: form.querySelector('#contact-message').value
    };

    var botField = form.querySelector('[name="bot-field"]');
    if (botField) formData['bot-field'] = botField.value;

    var encoded = Object.keys(formData).map(function(k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(formData[k]);
    }).join('&');

    // Submit to Netlify Forms (native form handling — no API key required;
    // configure notification email in Netlify dashboard → Forms → Settings).
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: encoded
    })
    .then(function(response) {
      if (response.ok) {
        form.style.display = 'none';
        successDiv.style.display = 'block';
      } else {
        throw new Error('Submission failed (status ' + response.status + ')');
      }
    })
    .catch(function(error) {
      form.style.display = 'none';
      errorDiv.style.display = 'block';
      errorMessage.textContent = error.message || 'Failed to send message. Please try again or email directly at skdev@1commerce.online';
    })
    .finally(function() {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
    });
  });
})();

// ─── SCROLL REVEAL ANIMATIONS ──────────────────────────────
(function(){
  var revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .stagger-children');
  if (!revealEls.length) return;

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  revealEls.forEach(function(el) { observer.observe(el); });
})();

// ─── ANIMATED COUNTERS ─────────────────────────────────────
(function(){
  var counters = document.querySelectorAll('.proof-number');
  if (!counters.length) return;

  function animateCounter(el) {
    var text = el.textContent.trim();
    var suffix = text.replace(/[\d.]/g, '');
    var target = parseFloat(text);
    if (isNaN(target)) return;

    var duration = 1200;
    var start = performance.now();
    var isPercent = suffix === '%';
    var isDecimal = text.indexOf('.') !== -1;

    function step(now) {
      var elapsed = now - start;
      var progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = eased * target;

      if (isDecimal) {
        el.textContent = current.toFixed(1) + suffix;
      } else {
        el.textContent = Math.round(current) + suffix;
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = text; // Ensure exact final value
      }
    }

    requestAnimationFrame(step);
  }

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        entry.target.closest('.proof-item').classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(function(el) { observer.observe(el); });
})();

// ─── SIGNAL PARTICLE CANVAS ────────────────────────────────
(function(){
  var canvas = document.getElementById('signal-canvas');
  if (!canvas) return;

  // Respect reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var ctx = canvas.getContext('2d');
  var particles = [];
  var maxParticles = 40;
  var dpr = window.devicePixelRatio || 1;

  function resize() {
    var hero = canvas.parentElement;
    canvas.width = hero.offsetWidth * dpr;
    canvas.height = hero.offsetHeight * dpr;
    canvas.style.width = hero.offsetWidth + 'px';
    canvas.style.height = hero.offsetHeight + 'px';
    ctx.scale(dpr, dpr);
  }

  function createParticle() {
    var hero = canvas.parentElement;
    return {
      x: Math.random() * hero.offsetWidth,
      y: Math.random() * hero.offsetHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      radius: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.4 + 0.1,
      pulseSpeed: Math.random() * 0.02 + 0.005,
      pulseOffset: Math.random() * Math.PI * 2
    };
  }

  // Init particles
  for (var i = 0; i < maxParticles; i++) {
    particles.push(createParticle());
  }

  var connectionDistance = 120;

  function draw() {
    var hero = canvas.parentElement;
    var w = hero.offsetWidth;
    var h = hero.offsetHeight;
    ctx.clearRect(0, 0, w, h);

    var time = Date.now() * 0.001;

    // Update and draw particles
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      var pulse = Math.sin(time * p.pulseSpeed * 60 + p.pulseOffset) * 0.3 + 0.7;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(232, 184, 106, ' + (p.opacity * pulse) + ')';
      ctx.fill();

      // Draw connections
      for (var j = i + 1; j < particles.length; j++) {
        var p2 = particles[j];
        var dx = p.x - p2.x;
        var dy = p.y - p2.y;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < connectionDistance) {
          var alpha = (1 - dist / connectionDistance) * 0.12;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = 'rgba(232, 184, 106, ' + alpha + ')';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  // Controlled loop — only animates while the hero is on-screen and the
  // tab is visible, so it never burns CPU/battery in the background.
  var rafId = null;
  var inView = true;

  function loop() {
    draw();
    rafId = requestAnimationFrame(loop);
  }
  function start() {
    if (!rafId && inView && !document.hidden) rafId = requestAnimationFrame(loop);
  }
  function stop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  resize();
  start();

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      if (inView) start(); else stop();
    }, { threshold: 0 }).observe(canvas.parentElement);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  var resizeTimeout;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resize, 150);
  });
})();

// ─── HEADER SCROLL EFFECT ──────────────────────────────────
(function(){
  var header = document.querySelector('.site-header');
  if (!header) return;

  var scrollThreshold = 50;
  var ticking = false;

  function updateHeader() {
    if (window.scrollY > scrollThreshold) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
    ticking = false;
  }

  window.addEventListener('scroll', function() {
    if (!ticking) {
      requestAnimationFrame(updateHeader);
      ticking = true;
    }
  }, { passive: true });

  updateHeader();
})();

// ─── SMOOTH SCROLL FOR ANCHOR LINKS ────────────────────────
(function(){
  document.querySelectorAll('a[href^="#"]').forEach(function(link) {
    link.addEventListener('click', function(e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
})();

// ─── POINTER-TRACKED CARD SPOTLIGHT ────────────────────────
// Feeds --spot-x / --spot-y to the glass cards so the amber sheen
// follows the cursor. Progressive enhancement only: skipped on
// touch / coarse pointers and when reduced motion is requested.
(function(){
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  var SELECTOR =
    '.cathedral-card, .client-tier-card, .partner-card, ' +
    '.feature-matrix-card, .dispatch-preview-card, .dossier-card, ' +
    '.entity-card, .pricing-card, .property-card, .video-series-card, ' +
    '.reel-card, .preview-card, .news-card, .profile-stats-card';

  var raf = null;

  function bind(card) {
    if (card._spotBound) return;
    card._spotBound = true;
    card.addEventListener('pointermove', function(e) {
      if (raf) return;
      raf = requestAnimationFrame(function() {
        var rect = card.getBoundingClientRect();
        card.style.setProperty('--spot-x', (e.clientX - rect.left) + 'px');
        card.style.setProperty('--spot-y', (e.clientY - rect.top) + 'px');
        raf = null;
      });
    }, { passive: true });
    card.addEventListener('pointerleave', function() {
      card.style.removeProperty('--spot-x');
      card.style.removeProperty('--spot-y');
    });
  }

  function init(root) {
    (root || document).querySelectorAll(SELECTOR).forEach(bind);
  }

  init();
  // Expose so runtime-injected cards (e.g. the news aggregator) can
  // opt in after they render.
  window.SignalSpotlight = init;
})();

// ─── CONTENT IMAGE FADE-IN + GRACEFUL FAILURE ──────────────
// Fades content imagery in once it decodes (skipped for already
// cached images so nothing flashes), and degrades broken images
// to a calm "image unavailable" frame instead of a broken glyph.
(function(){
  var imgs = document.querySelectorAll(
    '.section-image, .section-figure img, .hero-photo, ' +
    '.arc-featured-media img, .arc-item-media img, ' +
    'figure img, .dispatch-figure img'
  );
  if (!imgs.length) return;

  function markBroken(img) {
    img.classList.add('img-error');
    var frame = img.closest(
      '.section-figure, .arc-featured-media, .arc-item-media, ' +
      '.hero-photo-wrap, figure, .dispatch-figure'
    );
    if (frame) frame.classList.add('media-broken');
  }

  imgs.forEach(function(img) {
    // Never fade LCP / above-the-fold heroes — starting them at
    // opacity:0 would delay Largest Contentful Paint. Only lazy,
    // below-the-fold imagery gets the fade-in.
    var isPriority = img.loading === 'eager' ||
                     (img.getAttribute('fetchpriority') || '').toLowerCase() === 'high';

    // Already finished (cached) and valid — leave fully visible.
    if (img.complete) {
      if (img.naturalWidth === 0) markBroken(img);
      return;
    }
    if (isPriority) {
      // Still guard against a broken priority image, but no fade.
      img.addEventListener('error', function() { markBroken(img); }, { once: true });
      return;
    }
    img.classList.add('img-fade');
    img.addEventListener('load', function() {
      img.classList.add('img-loaded');
    }, { once: true });
    img.addEventListener('error', function() {
      img.classList.add('img-loaded'); // release the transition
      markBroken(img);
    }, { once: true });
  });
})();

// ─── LITE YOUTUBE FACADE (click-to-load) ───────────────────
// The real YouTube player (~1MB+ of JS) only loads when the user
// clicks the poster, keeping it off the initial page load.
(function(){
  var facades = document.querySelectorAll('.yt-facade');
  if (!facades.length) return;

  // YouTube video IDs are exactly 11 chars of [A-Za-z0-9_-]. Validating
  // against that allowlist sanitizes the attribute before it is used to
  // build the embed URL (prevents any injection via the data attribute).
  var YT_ID = /^[A-Za-z0-9_-]{11}$/;

  facades.forEach(function(facade) {
    facade.addEventListener('click', function() {
      var id = facade.getAttribute('data-yt-id');
      if (!id || !YT_ID.test(id)) return;
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' +
                   encodeURIComponent(id) + '?autoplay=1&rel=0';
      iframe.title = facade.getAttribute('data-yt-title') || 'Video player';
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      iframe.setAttribute('allowfullscreen', '');
      facade.replaceWith(iframe);
    });
  });
})();
