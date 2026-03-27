/* THE SIGNAL — App Logic */

// Theme toggle
(function(){
  const t = document.querySelector('[data-theme-toggle]');
  const r = document.documentElement;
  const stored = localStorage.getItem('signal-theme');
  let d = stored || r.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
  r.setAttribute('data-theme', d);
  updateIcon();

  if (t) {
    t.addEventListener('click', function() {
      d = d === 'dark' ? 'light' : 'dark';
      r.setAttribute('data-theme', d);
      localStorage.setItem('signal-theme', d);
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

// Reading progress bar
(function(){
  const bar = document.querySelector('.reading-progress');
  if (!bar) return;

  function update() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = Math.min(progress, 100) + '%';
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
})();

// Active section tracking (header nav)
(function(){
  const links = document.querySelectorAll('.nav-link');
  if (!links.length) return;

  const sections = ['foundation', 'revenue', 'systems', 'scale']
    .map(function(id) { return document.getElementById(id); })
    .filter(Boolean);

  if (!sections.length) return;

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        links.forEach(function(l) { l.classList.remove('active'); });
        var link = document.querySelector('.nav-link[href="#' + entry.target.id + '"]');
        if (link) link.classList.add('active');
      }
    });
  }, { threshold: 0.2, rootMargin: '-80px 0px -50% 0px' });

  sections.forEach(function(s) { observer.observe(s); });
})();

// Scroll reveal
(function(){
  var els = document.querySelectorAll('.dispatch, .quote-block, .entity-card, .status-bar, .newsletter-cta');
  els.forEach(function(el) { el.classList.add('reveal'); });

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  els.forEach(function(el) { observer.observe(el); });
})();

// Newsletter form handler
function handleSubscribe(e) {
  e.preventDefault();
  var form = e.target;
  var input = form.querySelector('.newsletter-input');
  var btn = form.querySelector('.newsletter-btn');
  var email = input.value;

  if (!email) return;

  // Visual feedback
  btn.querySelector('.btn-text').textContent = 'Sent ✓';
  form.classList.add('submitted');
  input.value = '';
  input.placeholder = 'Thanks — you\'re on the list.';
  input.disabled = true;
  btn.disabled = true;

  // Reset after 4 seconds
  setTimeout(function() {
    btn.querySelector('.btn-text').textContent = 'Subscribe';
    form.classList.remove('submitted');
    input.placeholder = 'your@email.com';
    input.disabled = false;
    btn.disabled = false;
  }, 4000);
}
