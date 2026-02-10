// Theme toggle — single-click cycle: auto → light → dark → auto
(function () {
  var STORAGE_KEY = 'theme-preference';
  var CYCLE = ['auto', 'light', 'dark'];

  // SVG icon paths
  var ICONS = {
    auto: '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
    light: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
    dark: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'
  };

  function getStored() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function setStored(v) {
    try { localStorage.setItem(STORAGE_KEY, v); } catch (e) {}
  }

  function getSystem() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function apply(pref) {
    var resolved = pref === 'auto' ? getSystem() : pref;
    document.documentElement.setAttribute('data-theme', resolved);
  }

  function updateIcon(pref) {
    document.querySelectorAll('.theme-toggle').forEach(function (btn) {
      var svg = btn.querySelector('svg');
      if (svg) svg.innerHTML = ICONS[pref] || ICONS.auto;
      btn.setAttribute('aria-label', pref === 'auto' ? 'Theme: auto' : 'Theme: ' + pref);
    });
  }

  // Initialize
  var preference = getStored() || 'auto';
  apply(preference);
  updateIcon(preference);

  // OS theme change (for auto mode)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
    var current = getStored() || 'auto';
    if (current === 'auto') apply('auto');
  });

  // Click handler — cycle through modes
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.theme-toggle');
    if (!btn) return;

    var current = getStored() || 'auto';
    var idx = CYCLE.indexOf(current);
    var next = CYCLE[(idx + 1) % CYCLE.length];

    setStored(next);
    apply(next);
    updateIcon(next);
  });
})();

// Mobile navigation toggle
(function () {
  var toggle = document.querySelector('.nav-toggle');
  var navLinks = document.querySelector('.nav-links');

  if (toggle && navLinks) {
    function setAria() {
      var expanded = navLinks.classList.contains('active');
      toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    }

    toggle.addEventListener('click', function () {
      toggle.classList.toggle('active');
      navLinks.classList.toggle('active');
      setAria();
    });

    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        toggle.classList.remove('active');
        navLinks.classList.remove('active');
        setAria();
      });
    });

    setAria();
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
    rootMargin: '0px 0px -30px 0px'
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
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeLightbox();
  });
})();

(function () {
  function setupRide(config) {
    function formatDistance(meters) {
      if (!meters && meters !== 0) return '--';
      var km = meters / 1000;
      return km.toFixed(1) + ' km';
    }

    function formatDuration(seconds) {
      if (!seconds && seconds !== 0) return '--';
      var h = Math.floor(seconds / 3600);
      var m = Math.round((seconds % 3600) / 60);
      if (m === 60) { h += 1; m = 0; }
      return h + 'h ' + m + 'm';
    }

    function setText(selector, value) {
      var el = document.querySelector(selector);
      if (el) el.textContent = value;
    }

    function getInlineRideData(inlineId) {
      var el = document.getElementById(inlineId);
      if (!el) return null;
      try { return JSON.parse(el.textContent); } catch (e) { return null; }
    }

    function renderRide(data) {
      if (!data || !data.points || !data.points.length) return;

      var stats = data.stats || {};
      setText('[data-ride-distance="' + config.dataId + '"]', formatDistance(stats.totalDistanceMeters));
      setText('[data-ride-duration="' + config.dataId + '"]', formatDuration(stats.durationSeconds));

    }

    fetch(config.fetchUrl)
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load ride data');
        return res.json();
      })
      .then(function (data) {
        renderRide(data);
      })
      .catch(function () {
        var inlineData = getInlineRideData(config.inlineId);
        if (inlineData) renderRide(inlineData);
      });
  }
  var rides = [
    {
      dataId: 'morning-ride',
      inlineId: 'ride-data',
      fetchUrl: 'data/morning-ride.json'
    },
    {
      dataId: 'mt-batur-hike',
      inlineId: 'ride-data-mt-batur-hike',
      fetchUrl: 'data/mt-batur-hike.json'
    }
  ];

  rides.forEach(setupRide);

  function setupReadingProgress() {
    var bar = document.querySelector('.reading-progress-bar');
    if (!bar) return;

    var ticking = false;

    function update() {
      var doc = document.documentElement;
      var scrollTop = doc.scrollTop || document.body.scrollTop;
      var scrollHeight = doc.scrollHeight || document.body.scrollHeight;
      var clientHeight = doc.clientHeight || window.innerHeight;
      var total = scrollHeight - clientHeight;
      var progress = total > 0 ? (scrollTop / total) : 1;
      progress = Math.max(0, Math.min(1, progress));
      bar.style.width = (progress * 100) + '%';
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  }

  setupReadingProgress();
})();
