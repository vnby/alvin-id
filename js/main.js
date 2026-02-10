// Theme toggle (Auto / Light / Dark)
(function () {
  var STORAGE_KEY = 'theme-preference';

  function getStoredPreference() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function setStoredPreference(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch (e) {}
  }

  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(preference) {
    var resolved = preference === 'auto' ? getSystemTheme() : preference;
    document.documentElement.setAttribute('data-theme', resolved);
  }

  function updateToggleUI(preference) {
    document.querySelectorAll('.theme-toggle button').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-theme-value') === preference);
    });
  }

  // Initialize on load
  var preference = getStoredPreference() || 'auto';
  applyTheme(preference);
  updateToggleUI(preference);

  // Listen for OS theme changes (relevant when in auto mode)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
    var current = getStoredPreference() || 'auto';
    if (current === 'auto') {
      applyTheme('auto');
    }
  });

  // Bind toggle buttons
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.theme-toggle button');
    if (!btn) return;

    var value = btn.getAttribute('data-theme-value');
    setStoredPreference(value);
    applyTheme(value);
    updateToggleUI(value);
  });
})();

// Mobile navigation toggle
(function () {
  var toggle = document.querySelector('.nav-toggle');
  var navLinks = document.querySelector('.nav-links');

  if (toggle && navLinks) {
    toggle.addEventListener('click', function () {
      toggle.classList.toggle('active');
      navLinks.classList.toggle('active');
    });

    // Close nav when a link is clicked
    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        toggle.classList.remove('active');
        navLinks.classList.remove('active');
      });
    });
  }
})();

// Nav scroll shadow
(function () {
  var nav = document.querySelector('.nav');
  if (!nav) return;

  window.addEventListener('scroll', function () {
    nav.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });
})();

// Scroll-triggered fade-in animations
(function () {
  var fadeElements = document.querySelectorAll('.fade-in');
  if (!fadeElements.length) return;

  if (!('IntersectionObserver' in window)) {
    fadeElements.forEach(function (el) { el.classList.add('visible'); });
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  fadeElements.forEach(function (el) { observer.observe(el); });
})();

// Lightbox for photography gallery
(function () {
  var lightbox = document.getElementById('lightbox');
  if (!lightbox) return;

  var lightboxImg = lightbox.querySelector('img');
  var closeBtn = lightbox.querySelector('.lightbox-close');

  document.querySelectorAll('.gallery-item').forEach(function (item) {
    item.addEventListener('click', function () {
      var img = item.querySelector('img');
      if (img) {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        lightbox.classList.add('active');
      }
    });
  });

  function closeLightbox() {
    lightbox.classList.remove('active');
    lightboxImg.src = '';
  }

  closeBtn.addEventListener('click', closeLightbox);

  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) {
      closeLightbox();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeLightbox();
    }
  });
})();
