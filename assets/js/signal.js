/* ============================================================
   THE SIGNAL — Shared Scripts
   signal.js v1.0 · 1Commerce LLC
   ============================================================ */

(function() {
  'use strict';

  /* ── Theme Toggle ────────────────────────────────────────── */
  function initTheme() {
    var btn = document.querySelector('[data-theme-toggle]');
    if (!btn) return;
    var html = document.documentElement;
    var stored = localStorage.getItem('theme');
    if (stored) html.setAttribute('data-theme', stored);
    btn.addEventListener('click', function() {
      var current = html.getAttribute('data-theme') || 'dark';
      var next = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
    });
  }

  /* ── Mobile Nav ──────────────────────────────────────────── */
  function initMobileNav() {
    var toggle = document.querySelector('.nav-toggle');
    var nav    = document.querySelector('.mobile-nav');
    var close  = document.querySelector('.mobile-nav-close');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', function() { nav.classList.add('open'); });
    if (close) close.addEventListener('click', function() { nav.classList.remove('open'); });
    document.addEventListener('click', function(e) {
      if (!nav.contains(e.target) && e.target !== toggle) {
        nav.classList.remove('open');
      }
    });
  }

  /* ── Contact Modal ───────────────────────────────────────── */
  function initContactModal() {
    var modal   = document.getElementById('contact-modal');
    if (!modal) return;
    var openers = document.querySelectorAll('[data-contact-modal]');
    var closers = document.querySelectorAll('[data-close-modal]');

    function open() {
      modal.removeAttribute('aria-hidden');
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function close() {
      modal.setAttribute('aria-hidden', 'true');
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }

    openers.forEach(function(el) { el.addEventListener('click', open); });
    closers.forEach(function(el) { el.addEventListener('click', close); });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') close();
    });
  }

  /* ── Subscribe Form ──────────────────────────────────────── */
  function initSubscribeForms() {
    document.querySelectorAll('.subscribe-form, .arc-subscribe-form').forEach(function(form) {
      form.addEventListener('submit', function(e) {
        var btn = form.querySelector('button[type="submit"]');
        if (btn) {
          btn.textContent = 'Subscribing...';
          btn.disabled = true;
          setTimeout(function() {
            btn.textContent = 'Subscribed ✓';
          }, 2000);
        }
      });
    });
  }

  /* ── Archive Filters ─────────────────────────────────────── */
  function initArchiveFilters() {
    var btns  = document.querySelectorAll('.arc-filter-btn');
    var items = document.querySelectorAll('#arc-list .arc-item');
    var empty = document.getElementById('arc-empty');
    if (!btns.length) return;

    btns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var filter = btn.getAttribute('data-filter');
        btns.forEach(function(b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var visible = 0;
        items.forEach(function(item) {
          if (filter === 'all' || item.getAttribute('data-type') === filter) {
            item.style.display = '';
            visible++;
          } else {
            item.style.display = 'none';
          }
        });
        if (empty) empty.style.display = visible === 0 ? 'block' : 'none';
      });
    });
  }

  /* ── Init ────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    initMobileNav();
    initContactModal();
    initSubscribeForms();
    initArchiveFilters();
  });

})();
