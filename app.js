/* THE SIGNAL — Platform Logic */

// Theme toggle
(function(){
  const t = document.querySelector('[data-theme-toggle]');
  const r = document.documentElement;
  // Check localStorage first, then fall back to attribute / media query
  var stored; try { stored = localStorage.getItem('signal-theme'); } catch(e) {}
  let d = stored || r.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
  r.setAttribute('data-theme', d);
  updateIcon();

  if (t) {
    t.addEventListener('click', function() {
      d = d === 'dark' ? 'light' : 'dark';
      r.setAttribute('data-theme', d);
      try { localStorage.setItem('signal-theme', d); } catch(e) {}
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

// Mobile nav
(function(){
  var toggle = document.querySelector('.nav-toggle');
  var mobileNav = document.querySelector('.mobile-nav');
  var closeBtn = document.querySelector('.mobile-nav-close');
  
  if (!toggle || !mobileNav) return;

  toggle.addEventListener('click', function() {
    mobileNav.classList.add('open');
    document.body.style.overflow = 'hidden';
  });

  function closeMobileNav() {
    mobileNav.classList.remove('open');
    document.body.style.overflow = '';
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closeMobileNav);
  }

  // Close on link click
  mobileNav.querySelectorAll('a').forEach(function(link) {
    link.addEventListener('click', closeMobileNav);
  });

  // Close on escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && mobileNav.classList.contains('open')) {
      closeMobileNav();
    }
  });
})();

// Scroll reveal
(function(){
  var selectors = '.dispatch, .quote-block, .entity-card, .status-bar, .value-section, .latest-issue, .subscribe-section, .social-proof, .properties-section, .archive-section, .about-section, .about-block, .cta-block, .archive-card, .value-card, .property-card, .pricing-card, .cathedral-phase';
  var els = document.querySelectorAll(selectors);
  els.forEach(function(el) { el.classList.add('reveal'); });

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

  els.forEach(function(el) { observer.observe(el); });
})();

// Subscribe form handling (MailerLite)
(function(){
  var forms = document.querySelectorAll('.subscribe-form, .footer-subscribe-form');
  forms.forEach(function(form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var emailInput = form.querySelector('input[type="email"]');
      var submitBtn = form.querySelector('button[type="submit"]');
      var email = emailInput ? emailInput.value.trim() : '';
      
      if (!email || !email.includes('@')) return;

      // Show loading state
      var originalText = submitBtn.textContent;
      submitBtn.textContent = 'SENDING...';
      submitBtn.disabled = true;

      // MailerLite JSONP submit
      var script = document.createElement('script');
      script.src = 'https://assets.mailerlite.com/jsonp/887036/forms/131950373498498498/subscribe?fields[email]=' + encodeURIComponent(email) + '&callback=mlCallback' + Date.now();
      
      // Define callback
      var cbName = 'mlCallback' + Date.now();
      window[cbName] = function(resp) {
        submitBtn.textContent = 'SUBSCRIBED ✓';
        emailInput.value = '';
        setTimeout(function() {
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
        }, 3000);
        delete window[cbName];
      };

      // Fallback: always show success after timeout (JSONP may not call back)
      setTimeout(function() {
        if (submitBtn.textContent === 'SENDING...') {
          submitBtn.textContent = 'SUBSCRIBED ✓';
          emailInput.value = '';
          setTimeout(function() {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
          }, 3000);
        }
      }, 3000);

      document.head.appendChild(script);
    });
  });
})();
