/* ============================================================
   THE SIGNAL — Instagram Recent Videos Embed
   instagram-feed.js v1.0 · 1Commerce LLC

   Fetches a public Instagram RSS feed (via the CSP-allowlisted
   api.rss2json.com proxy) and renders a grid of recent posts that
   link back to Instagram. Progressive enhancement: the container
   ships a loading state and a no-JS fallback link.

   Markup contract — any element with [data-ig-feed]:
     data-ig-rss     (required) the RSS feed URL
     data-ig-limit   (optional) max items to render, default 6
     data-ig-handle  (optional) IG handle for the fallback link
   ============================================================ */

(function () {
  'use strict';

  var PROXY = 'https://api.rss2json.com/v1/api.json';

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function profileUrl(handle) {
    return handle
      ? 'https://www.instagram.com/' + encodeURIComponent(handle) + '/'
      : 'https://www.instagram.com/';
  }

  // Strip trailing hashtags for a cleaner caption, keep a usable title.
  function cleanTitle(raw) {
    var t = String(raw || '').replace(/\s*#[^\s#]+/g, '').trim();
    return t || String(raw || '').trim() || 'View on Instagram';
  }

  function formatDate(str) {
    if (!str) return '';
    var d = new Date(str.replace(' ', 'T'));
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  function pickThumb(item) {
    if (item.thumbnail) return item.thumbnail;
    if (item.enclosure && item.enclosure.link) return item.enclosure.link;
    return '';
  }

  function renderError(el, handle) {
    el.innerHTML =
      '<p class="ig-feed-status ig-feed-status--error">' +
      'Couldn\'t load the latest videos right now. ' +
      '<a href="' + esc(profileUrl(handle)) + '" target="_blank" rel="noopener noreferrer">' +
      'View them on Instagram &#8599;</a></p>';
  }

  function renderItems(el, items, handle) {
    if (!items.length) {
      renderError(el, handle);
      return;
    }

    var html = items.map(function (item) {
      var thumb = pickThumb(item);
      var title = cleanTitle(item.title || item.description);
      var date = formatDate(item.pubDate);
      var link = item.link || profileUrl(handle);

      return '' +
        '<a class="ig-card" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer" ' +
        'aria-label="' + esc(title) + ' — open on Instagram">' +
          '<span class="ig-card-media">' +
            (thumb
              ? '<img class="ig-card-img" src="' + esc(thumb) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">'
              : '<span class="ig-card-img ig-card-img--empty" aria-hidden="true"></span>') +
            '<span class="ig-card-play" aria-hidden="true">' +
              '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' +
            '</span>' +
          '</span>' +
          '<span class="ig-card-body">' +
            '<span class="ig-card-title">' + esc(title) + '</span>' +
            (date ? '<span class="ig-card-date mono-label dim">' + esc(date) + '</span>' : '') +
          '</span>' +
        '</a>';
    }).join('');

    el.innerHTML = html;
  }

  function loadFeed(el) {
    var rss = el.getAttribute('data-ig-rss');
    var handle = el.getAttribute('data-ig-handle') || '';
    var limit = parseInt(el.getAttribute('data-ig-limit'), 10);
    if (!rss) return;
    if (!limit || limit < 1) limit = 6;

    var url = PROXY +
      '?rss_url=' + encodeURIComponent(rss) +
      '&count=' + encodeURIComponent(limit);

    fetch(url, { headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data || data.status !== 'ok' || !Array.isArray(data.items)) {
          throw new Error('Unexpected feed response');
        }
        renderItems(el, data.items.slice(0, limit), handle);
      })
      .catch(function () {
        renderError(el, handle);
      });
  }

  function init() {
    var feeds = document.querySelectorAll('[data-ig-feed]');
    if (!feeds.length) return;
    Array.prototype.forEach.call(feeds, loadFeed);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
