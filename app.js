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

// Initialize auth UI state
(function(){
  // Update auth nav on load and auth state changes
  if (typeof updateAuthUI === 'function') {
    updateAuthUI();
    try {
      const sb = getSupabase();
      sb.auth.onAuthStateChange((event, session) => {
        updateAuthUI();
      });
    } catch (e) { /* supabase not ready */ }
  }
})();

// Mobile nav toggle
(function(){
  const header = document.querySelector('.site-header');
  const nav = document.querySelector('.header-nav');
  if (!header || !nav) return;

  // Create hamburger button
  const menuBtn = document.createElement('button');
  menuBtn.className = 'mobile-menu-btn';
  menuBtn.setAttribute('aria-label', 'Toggle navigation');
  menuBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';

  const headerInner = header.querySelector('.header-inner');
  headerInner.insertBefore(menuBtn, nav);

  menuBtn.addEventListener('click', () => {
    nav.classList.toggle('open');
    const isOpen = nav.classList.contains('open');
    menuBtn.innerHTML = isOpen
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
  });

  // Close on route change
  window.addEventListener('hashchange', () => {
    nav.classList.remove('open');
    menuBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
  });
})();
