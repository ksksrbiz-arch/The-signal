/* THE SIGNAL — Hash-based SPA Router */

const routes = {};
let currentRoute = null;

function registerRoute(path, handler) {
  routes[path] = handler;
}

function navigateTo(path) {
  window.location.hash = '#' + path;
}

function getRouteParams() {
  const hash = window.location.hash.slice(1) || '/';
  const [path, query] = hash.split('?');
  const params = {};
  if (query) {
    query.split('&').forEach(p => {
      const [k, v] = p.split('=');
      params[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
  }
  return { path, params };
}

function matchRoute(path) {
  // Exact match first
  if (routes[path]) return { handler: routes[path], params: {} };

  // Pattern matching (/post/:slug etc)
  for (const pattern in routes) {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');
    if (patternParts.length !== pathParts.length) continue;

    const params = {};
    let match = true;
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = pathParts[i];
      } else if (patternParts[i] !== pathParts[i]) {
        match = false;
        break;
      }
    }
    if (match) return { handler: routes[pattern], params };
  }
  return null;
}

async function handleRoute() {
  const { path, params: queryParams } = getRouteParams();
  const match = matchRoute(path);

  const appContent = document.getElementById('app-content');
  if (!appContent) return;

  if (match) {
    currentRoute = path;
    try {
      await match.handler({ ...match.params, ...queryParams }, appContent);
    } catch (e) {
      console.error('Route error:', e);
      appContent.innerHTML = renderErrorPage('Something went wrong', e.message);
    }
  } else {
    appContent.innerHTML = renderErrorPage('Page Not Found', 'The transmission you are looking for does not exist.');
  }

  // Scroll to top on route change
  window.scrollTo(0, 0);

  // Update active nav
  updateNavState(path);
}

function updateNavState(path) {
  document.querySelectorAll('.main-nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === '#' + path || (path === '/' && href === '#/')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

function renderErrorPage(title, message) {
  return `
    <section class="error-page">
      <div class="error-inner">
        <span class="mono-label accent-text">◈ SIGNAL LOST ◈</span>
        <h1 class="error-title">${title}</h1>
        <p class="error-message">${message}</p>
        <a href="#/" class="error-link mono-label">← Return to Base</a>
      </div>
    </section>
  `;
}

// Listen for hash changes
window.addEventListener('hashchange', handleRoute);

// Handle initial load
document.addEventListener('DOMContentLoaded', () => {
  // If no hash, set to home
  if (!window.location.hash || window.location.hash === '#') {
    window.location.hash = '#/';
  }
  handleRoute();
});
