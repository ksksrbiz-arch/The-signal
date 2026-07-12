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

// ─── UX ENHANCEMENTS · WAVE 1 ──────────────────────────────
// Global, progressive-enhancement UX for every page (nav, reading,
// forms, motion). Self-contained: styles are injected here so no
// stylesheet cache-bust is required, and all motion honors
// prefers-reduced-motion.
(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var css = document.createElement('style');
  css.textContent = [
    '.u-totop{position:fixed;right:20px;bottom:20px;z-index:120;width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:50%;border:1px solid rgba(232,184,106,.4);background:rgba(11,14,20,.72);color:#E8B86A;cursor:pointer;opacity:0;transform:translateY(12px);pointer-events:none;transition:opacity .28s ease,transform .28s ease,background .2s;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}',
    '.u-totop.show{opacity:1;transform:none;pointer-events:auto}',
    '.u-totop:hover{background:rgba(232,184,106,.16)}',
    '.u-totop:focus-visible{outline:2px solid #E8B86A;outline-offset:3px}',
    'main :is(h2,h3)[id]{scroll-margin-top:90px}',
    '.u-anchor{opacity:0;margin-left:.4em;display:inline-flex;vertical-align:middle;color:#E8B86A;background:none;border:0;cursor:pointer;transition:opacity .18s;padding:2px;line-height:0}',
    'main :is(h2,h3):hover .u-anchor,.u-anchor:focus-visible{opacity:.65}',
    '.u-anchor:hover{opacity:1!important}',
    '.u-anchor.copied{color:#4FB477;opacity:1!important}',
    '.u-toast{position:fixed;left:50%;bottom:28px;transform:translate(-50%,16px);z-index:200;background:rgba(11,14,20,.92);color:#E8E4D8;border:1px solid rgba(232,184,106,.4);border-radius:8px;padding:11px 18px;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:12px;letter-spacing:.04em;opacity:0;pointer-events:none;transition:opacity .3s ease,transform .3s ease;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}',
    '.u-toast.show{opacity:1;transform:translate(-50%,0)}',
    '.u-toast.err{border-color:rgba(208,85,78,.6);color:#f0d9d7}',
    'form.u-busy button{opacity:.6;pointer-events:none}',
    'input[aria-invalid="true"]{border-color:rgba(208,85,78,.7)!important}',
    reduce ? '' : ':root.u-theme-anim,:root.u-theme-anim *{transition:background-color .35s ease,border-color .35s ease,color .25s ease!important}'
  ].join('');
  document.head.appendChild(css);

  // Toast helper (exposed for reuse)
  var toastEl, toastT;
  function toast(msg, isErr){
    if(!toastEl){ toastEl=document.createElement('div'); toastEl.className='u-toast'; toastEl.setAttribute('role','status'); toastEl.setAttribute('aria-live','polite'); document.body.appendChild(toastEl); }
    toastEl.textContent=msg; toastEl.classList.toggle('err', !!isErr);
    void toastEl.offsetWidth; toastEl.classList.add('show');
    clearTimeout(toastT); toastT=setTimeout(function(){ toastEl.classList.remove('show'); }, 2600);
  }
  window.SignalToast = toast;

  // 1) Back-to-top button (nav / wayfinding)
  var toTop=document.createElement('button');
  toTop.className='u-totop'; toTop.type='button'; toTop.setAttribute('aria-label','Back to top');
  toTop.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  document.body.appendChild(toTop);
  var shown=false, ticking=false;
  function updTop(){ var s=window.scrollY>600; if(s!==shown){ shown=s; toTop.classList.toggle('show', s); } ticking=false; }
  window.addEventListener('scroll', function(){ if(!ticking){ requestAnimationFrame(updTop); ticking=true; } }, { passive:true });
  toTop.addEventListener('click', function(){ window.scrollTo({ top:0, behavior: reduce?'auto':'smooth' }); });
  updTop();

  // 2) Deep-link anchors on content headings (reading experience)
  var used={};
  function slug(s){ return s.toLowerCase().trim().replace(/[^\w\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').slice(0,60) || 'section'; }
  var main=document.querySelector('main');
  if(main){
    main.querySelectorAll('h2,h3').forEach(function(h){
      var txt=(h.textContent||'').trim();
      if(!txt || h.querySelector('a,button')) return;
      if(!h.id){ var base=slug(txt), id=base, n=2; while(document.getElementById(id)||used[id]){ id=base+'-'+(n++); } h.id=id; used[id]=1; }
      var b=document.createElement('button');
      b.className='u-anchor'; b.type='button'; b.setAttribute('aria-label','Copy link to “'+txt+'”');
      b.innerHTML='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>';
      b.addEventListener('click', function(){
        var url=location.origin+location.pathname+'#'+h.id;
        function done(){ try{ history.replaceState(null,'','#'+h.id); }catch(e){} b.classList.add('copied'); toast('Link copied'); setTimeout(function(){ b.classList.remove('copied'); },1600); }
        if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(url).then(done).catch(fallback); } else { fallback(); }
        function fallback(){ var ta=document.createElement('textarea'); ta.value=url; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); }catch(e){} document.body.removeChild(ta); done(); }
      });
      h.appendChild(b);
    });
  }

  // 3) Subscribe forms: inline validation + busy state (forms/feedback).
  // Native POST still proceeds for valid emails — we only guard bad input
  // and reflect a submitting state.
  var EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  document.querySelectorAll('form.subscribe-form, form.arc-subscribe-form').forEach(function(f){
    f.addEventListener('submit', function(e){
      var input=f.querySelector('input[type="email"], input[name*="email" i]');
      if(input && !EMAIL.test((input.value||'').trim())){
        e.preventDefault(); input.setAttribute('aria-invalid','true'); input.focus(); toast('Enter a valid email address', true); return;
      }
      if(input) input.removeAttribute('aria-invalid');
      f.classList.add('u-busy');
      var btn=f.querySelector('button[type="submit"], button:not([type])');
      if(btn && !btn.dataset.orig){ btn.dataset.orig=btn.textContent; btn.textContent='Subscribing…'; }
    });
  });

  // 4) Theme-toggle crossfade (motion). Enables color transitions only
  // for ~0.4s around a toggle so normal scrolling stays snappy.
  var tt=document.querySelector('[data-theme-toggle]');
  if(tt && !reduce){
    tt.addEventListener('click', function(){
      var root=document.documentElement; root.classList.add('u-theme-anim');
      clearTimeout(tt._an); tt._an=setTimeout(function(){ root.classList.remove('u-theme-anim'); }, 450);
    });
  }
})();

// ─── POST ENGAGEMENT (reactions + views) ───────────────────
// Hydrates the reaction bar from /api/engagement (Netlify Blobs), records a
// view once per session, and posts a reaction once per type per browser
// (localStorage-guarded, optimistic). No-ops on pages without a reaction bar.
(function(){
  var bar=document.querySelector('.reaction-bar');
  if(!bar) return;
  var id=location.pathname;
  var API='/api/engagement';

  var css=document.createElement('style');
  css.textContent=[
    '.reaction-views{display:inline-flex;align-items:center;gap:6px;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--faint,#9AA2AE);margin-left:auto}',
    '.reaction-views b{color:var(--active,#E8B86A);font-weight:600}',
    '.reaction-btn.reacted{border-color:rgba(232,184,106,.5)}',
    '.reaction-btn.reacted .reaction-count{color:var(--active,#E8B86A)}',
    '.reaction-btn.bump{animation:reactbump .4s ease}',
    '@keyframes reactbump{40%{transform:scale(1.18)}}'
  ].join('');
  document.head.appendChild(css);

  // views badge appended to the bar label row
  var views=document.createElement('span');
  views.className='reaction-views';
  views.innerHTML='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg><span><b>—</b> views</span>';
  var label=bar.querySelector('.reaction-bar-label');
  (label||bar).insertAdjacentElement(label?'afterend':'afterbegin', views);
  var viewsNum=views.querySelector('b');

  function paint(data){
    if(data && data.reactions){
      bar.querySelectorAll('.reaction-btn').forEach(function(btn){
        var k=btn.getAttribute('data-reaction');
        var c=btn.querySelector('.reaction-count');
        if(c && typeof data.reactions[k]==='number') c.textContent=data.reactions[k];
      });
    }
    if(data && typeof data.views==='number') viewsNum.textContent=data.views;
  }
  function req(method, body){
    var opts={method:method,headers:{'Content-Type':'application/json'}};
    if(body) opts.body=JSON.stringify(body);
    var url=API+(method==='GET'?('?id='+encodeURIComponent(id)):'');
    return fetch(url,opts).then(function(r){return r.json();}).catch(function(){return null;});
  }

  // hydrate
  req('GET').then(function(d){ if(d) paint(d); });

  // record a view once per session
  try{
    var vk='sig-viewed:'+id;
    if(!sessionStorage.getItem(vk)){
      sessionStorage.setItem(vk,'1');
      req('POST',{id:id,type:'view'}).then(function(d){ if(d && d.ok) paint(d); });
    }
  }catch(e){}

  // reactions — one per type per browser
  bar.querySelectorAll('.reaction-btn').forEach(function(btn){
    var k=btn.getAttribute('data-reaction');
    var rk='sig-react:'+id+':'+k;
    var already=false;
    try{ already=!!localStorage.getItem(rk); }catch(e){}
    if(already) btn.classList.add('reacted');
    btn.addEventListener('click', function(){
      try{ if(localStorage.getItem(rk)) return; localStorage.setItem(rk,'1'); }catch(e){}
      btn.classList.add('reacted','bump');
      setTimeout(function(){ btn.classList.remove('bump'); },400);
      var c=btn.querySelector('.reaction-count');
      if(c) c.textContent=(parseInt(c.textContent,10)||0)+1; // optimistic
      req('POST',{id:id,type:'react',reaction:k}).then(function(d){ if(d && d.ok) paint(d); });
    });
  });
})();

// ─── COMMAND-K SEARCH PALETTE + RELATED POSTS ──────────────
// A quick-jump palette (Cmd/Ctrl-K, or "/") that queries /api/search across
// every dispatch, fieldnote and daily brief, and a "Related" block appended to
// article pages. Both read the build-time content index via the search API.
(function(){
  var css=document.createElement('style');
  css.textContent=[
    '.k-overlay{position:fixed;inset:0;z-index:300;display:none;align-items:flex-start;justify-content:center;background:rgba(6,8,12,.6);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px)}',
    '.k-overlay.open{display:flex}',
    '.k-box{margin-top:12vh;width:min(620px,92vw);background:var(--panel,#12161f);border:1px solid var(--rule,#232a36);border-radius:12px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.5)}',
    '.k-inp{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--rule,#232a36)}',
    '.k-inp svg{color:var(--active,#E8B86A);flex:0 0 auto}',
    '.k-inp input{flex:1;background:none;border:0;outline:none;color:var(--text,#E8E4D8);font-family:"IBM Plex Sans",system-ui,sans-serif;font-size:1.02rem}',
    '.k-inp kbd{font-family:"JetBrains Mono",monospace;font-size:10px;color:var(--faint,#9AA2AE);border:1px solid var(--rule,#232a36);border-radius:4px;padding:2px 6px}',
    '.k-list{max-height:56vh;overflow:auto;margin:0;padding:6px;list-style:none}',
    '.k-item{display:block;padding:10px 12px;border-radius:8px;text-decoration:none;color:var(--text,#E8E4D8);cursor:pointer}',
    '.k-item:hover,.k-item.sel{background:rgba(232,184,106,.1)}',
    '.k-item .k-t{font-family:"Fraunces",Georgia,serif;font-size:1rem;line-height:1.2}',
    '.k-item .k-m{display:flex;gap:8px;align-items:center;margin-top:3px;font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--faint,#9AA2AE)}',
    '.k-item .k-badge{color:var(--active,#E8B86A)}',
    '.k-empty{padding:22px 16px;color:var(--faint,#9AA2AE);font-family:"JetBrains Mono",monospace;font-size:12px}',
    '.related{max-width:760px;margin:8px auto 0;padding:34px 24px 8px;border-top:1px solid var(--rule,#232a36)}',
    '.related h2{font-family:"JetBrains Mono",monospace;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:var(--active,#E8B86A);margin:0 0 16px}',
    '.related-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
    '.related-card{display:block;border:1px solid var(--rule,#232a36);border-radius:8px;padding:14px 16px;text-decoration:none;color:var(--text,#E8E4D8);background:var(--panel,#12161f);transition:border-color .18s}',
    '.related-card:hover{border-color:rgba(232,184,106,.45)}',
    '.related-card .rc-m{font-family:"JetBrains Mono",monospace;font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--faint,#9AA2AE)}',
    '.related-card .rc-t{font-family:"Fraunces",Georgia,serif;font-size:1.02rem;line-height:1.2;margin-top:6px}',
    '@media(max-width:600px){.related-grid{grid-template-columns:1fr}}'
  ].join('');
  document.head.appendChild(css);

  // ---- palette ----
  var overlay=document.createElement('div');
  overlay.className='k-overlay'; overlay.setAttribute('role','dialog'); overlay.setAttribute('aria-label','Search the Signal');
  overlay.innerHTML=''
    +'<div class="k-box">'
    +'<div class="k-inp"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>'
    +'<input type="text" placeholder="Search dispatches, fieldnotes, daily…" aria-label="Search" autocomplete="off" spellcheck="false"><kbd>ESC</kbd></div>'
    +'<ul class="k-list" role="listbox"></ul>'
    +'</div>';
  document.body.appendChild(overlay);
  var input=overlay.querySelector('input');
  var list=overlay.querySelector('.k-list');
  var lastFocus=null, sel=-1, results=[], t=null;

  function open(){
    lastFocus=document.activeElement;
    overlay.classList.add('open');
    input.value=''; input.focus();
    query('');
  }
  function close(){
    overlay.classList.remove('open');
    if(lastFocus&&lastFocus.focus) lastFocus.focus();
  }
  function render(){
    if(!results.length){ list.innerHTML='<li class="k-empty">No matches.</li>'; return; }
    list.innerHTML=results.map(function(r,i){
      return '<a class="k-item'+(i===sel?' sel':'')+'" role="option" href="'+r.path+'" data-i="'+i+'">'
        +'<div class="k-t">'+esc(r.title)+'</div>'
        +'<div class="k-m"><span class="k-badge">'+esc(r.type||r.stream)+'</span>'+(r.date?'<span>'+r.date+'</span>':'')+(r.readMins?'<span>'+r.readMins+' min</span>':'')+'</div></a>';
    }).join('');
  }
  function esc(s){ return String(s||'').replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function query(q){
    clearTimeout(t);
    t=setTimeout(function(){
      fetch('/api/search?q='+encodeURIComponent(q)).then(function(r){return r.json();}).then(function(d){
        results=(d&&d.results)||[]; sel=results.length?0:-1; render();
      }).catch(function(){ results=[]; render(); });
    },140);
  }
  function move(dir){
    if(!results.length) return;
    sel=(sel+dir+results.length)%results.length;
    render();
    var el=list.querySelector('.k-item.sel'); if(el) el.scrollIntoView({block:'nearest'});
  }
  function go(){ if(sel>=0&&results[sel]) location.href=results[sel].path; }

  input.addEventListener('input', function(){ query(input.value.trim()); });
  input.addEventListener('keydown', function(e){
    if(e.key==='ArrowDown'){ e.preventDefault(); move(1); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); move(-1); }
    else if(e.key==='Enter'){ e.preventDefault(); go(); }
    else if(e.key==='Escape'){ e.preventDefault(); close(); }
  });
  list.addEventListener('click', function(e){ var a=e.target.closest('.k-item'); if(a){ e.preventDefault(); location.href=a.getAttribute('href'); } });
  overlay.addEventListener('click', function(e){ if(e.target===overlay) close(); });

  function editable(el){ return el && (el.tagName==='INPUT'||el.tagName==='TEXTAREA'||el.isContentEditable); }
  document.addEventListener('keydown', function(e){
    if((e.metaKey||e.ctrlKey) && (e.key==='k'||e.key==='K')){ e.preventDefault(); overlay.classList.contains('open')?close():open(); }
    else if(e.key==='/' && !overlay.classList.contains('open') && !editable(document.activeElement)){ e.preventDefault(); open(); }
  });
  // Optional explicit triggers
  document.querySelectorAll('[data-search-open]').forEach(function(b){ b.addEventListener('click', open); });
  window.SignalSearch={open:open};

  // ---- related posts (article pages only) ----
  if(/^\/(archive|fieldnotes|daily)\/[^/]+\.html$/.test(location.pathname)){
    var main=document.querySelector('main');
    if(main){
      fetch('/api/search?related='+encodeURIComponent(location.pathname)).then(function(r){return r.json();}).then(function(d){
        var rs=(d&&d.results)||[]; if(!rs.length) return;
        var sec=document.createElement('section'); sec.className='related';
        sec.innerHTML='<h2>Related transmissions</h2><div class="related-grid">'+rs.map(function(r){
          return '<a class="related-card" href="'+r.path+'"><div class="rc-m">'+esc(r.type||r.stream)+(r.date?' · '+r.date:'')+'</div><div class="rc-t">'+esc(r.title)+'</div></a>';
        }).join('')+'</div>';
        main.appendChild(sec);
      }).catch(function(){});
    }
  }
})();

// ─── SERIES BANNER (part-of-series + prev/next-in-series) ──
// On an article page that belongs to a curated series, inject a banner with the
// series name, position, and prev/next-in-series links. Reads the generated
// data/series-map.json — no per-post markup required.
(function(){
  if(!/^\/(archive|fieldnotes|daily)\/[^/]+\.html$/.test(location.pathname)) return;
  var main=document.querySelector('main'); if(!main) return;
  fetch('/data/series-map.json').then(function(r){return r.json();}).then(function(map){
    var mem=(map||{})[location.pathname]; if(!mem||!mem.length) return; var s=mem[0];
    var css=document.createElement('style');
    css.textContent=[
      '.series-banner{max-width:760px;margin:18px auto 0;padding:14px 20px;display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;border:1px solid rgba(232,184,106,.35);border-radius:10px;background:rgba(232,184,106,.06)}',
      '.series-banner .sb-k{font-family:"JetBrains Mono",monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--active,#E8B86A)}',
      '.series-banner .sb-name{font-family:"Fraunces",Georgia,serif;font-size:1.05rem;color:var(--text,#E8E4D8)}',
      '.series-banner .sb-name a{color:inherit;text-decoration:none;border-bottom:1px solid rgba(232,184,106,.4)}',
      '.series-banner .sb-pos{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--faint,#9AA2AE)}',
      '.series-banner .sb-nav{margin-left:auto;display:flex;gap:12px;font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase}',
      '.series-banner .sb-nav a{color:var(--active,#E8B86A);text-decoration:none}',
      '.series-banner .sb-nav span{color:var(--faint,#9AA2AE);opacity:.5}'
    ].join('');
    document.head.appendChild(css);
    var el=document.createElement('aside'); el.className='series-banner'; el.setAttribute('aria-label','Series navigation');
    el.innerHTML=''
      +'<span class="sb-k">◆ Series</span>'
      +'<span class="sb-name"><a href="'+s.url+'">'+s.name+'</a></span>'
      +'<span class="sb-pos">Part '+s.index+' of '+s.total+'</span>'
      +'<span class="sb-nav">'
      +(s.prev?'<a href="'+s.prev+'">← Prev</a>':'<span>← Prev</span>')
      +(s.next?'<a href="'+s.next+'">Next →</a>':'<span>Next →</span>')
      +'</span>';
    // place just inside <main>, above the article
    main.insertBefore(el, main.firstChild);
  }).catch(function(){});
})();
