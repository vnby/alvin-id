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
    var canvas = document.getElementById(config.mapImageId || config.mapCanvasId);
    if (!canvas) return;

    function formatDistance(meters) {
      if (!meters && meters !== 0) return '--';
      var km = meters / 1000;
      return km.toFixed(1) + ' km';
    }

    function formatElevation(meters) {
      if (!meters && meters !== 0) return '--';
      return Math.round(meters) + ' m';
    }

    function formatDuration(seconds) {
      if (!seconds && seconds !== 0) return '--';
      var h = Math.floor(seconds / 3600);
      var m = Math.round((seconds % 3600) / 60);
      if (m === 60) { h += 1; m = 0; }
      return h + 'h ' + m + 'm';
    }

    function formatSpeed(distanceMeters, durationSeconds) {
      if (!distanceMeters || !durationSeconds) return '--';
      var kmh = (distanceMeters / 1000) / (durationSeconds / 3600);
      return kmh.toFixed(1) + ' km/h';
    }

    function formatSpeedFromMps(mps) {
      if (!mps && mps !== 0) return '--';
      return (mps * 3.6).toFixed(1) + ' km/h';
    }

    function formatBpm(v) {
      if (!v && v !== 0) return '--';
      return Math.round(v) + ' bpm';
    }

    function setText(selector, value) {
      var el = document.querySelector(selector);
      if (el) el.textContent = value;
    }

    function drawSparkline(canvas, values, color) {
      if (!canvas || !values || !values.length) return;

      var rect = canvas.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));

      var ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);

      var width = rect.width;
      var height = rect.height;
      var pad = 8;

      var min = values[0];
      var max = values[0];
      for (var i = 1; i < values.length; i++) {
        if (values[i] < min) min = values[i];
        if (values[i] > max) max = values[i];
      }
      var span = Math.max(1e-6, max - min);

      function x(i) {
        return pad + (i / (values.length - 1)) * (width - pad * 2);
      }

      function y(v) {
        return pad + (1 - (v - min) / span) * (height - pad * 2);
      }

      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (var i = 0; i < values.length; i++) {
        var xi = x(i);
        var yi = y(values[i]);
        if (i === 0) ctx.moveTo(xi, yi);
        else ctx.lineTo(xi, yi);
      }
      ctx.stroke();
    }

    function drawRide(points, bbox) {
      var rect = canvas.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));

      var ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);

      var width = rect.width;
      var height = rect.height;
      var pad = 18;

      var minLon = bbox[0];
      var minLat = bbox[1];
      var maxLon = bbox[2];
      var maxLat = bbox[3];

      var lonSpan = Math.max(1e-6, maxLon - minLon);
      var latSpan = Math.max(1e-6, maxLat - minLat);

      function project(lat, lon) {
        var x = (lon - minLon) / lonSpan;
        var y = (maxLat - lat) / latSpan;
        return [pad + x * (width - pad * 2), pad + y * (height - pad * 2)];
      }

      ctx.clearRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(27, 77, 62, 0.08)';
      ctx.lineWidth = 1;
      var gridCount = 5;
      for (var i = 1; i < gridCount; i++) {
        var gx = pad + (width - pad * 2) * (i / gridCount);
        var gy = pad + (height - pad * 2) * (i / gridCount);
        ctx.beginPath();
        ctx.moveTo(gx, pad);
        ctx.lineTo(gx, height - pad);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pad, gy);
        ctx.lineTo(width - pad, gy);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(27, 77, 62, 0.9)';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      points.forEach(function (p, idx) {
        var xy = project(p.lat, p.lon);
        if (idx === 0) ctx.moveTo(xy[0], xy[1]);
        else ctx.lineTo(xy[0], xy[1]);
      });
      ctx.stroke();

      var start = project(points[0].lat, points[0].lon);
      var end = project(points[points.length - 1].lat, points[points.length - 1].lon);

      ctx.fillStyle = 'rgba(27, 77, 62, 0.95)';
      ctx.beginPath();
      ctx.arc(start[0], start[1], 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(27, 77, 62, 0.55)';
      ctx.beginPath();
      ctx.arc(end[0], end[1], 6, 0, Math.PI * 2);
      ctx.fill();
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
      setText('[data-ride-elevation="' + config.dataId + '"]', formatElevation(stats.elevationGainMeters));
      setText('[data-ride-duration="' + config.dataId + '"]', formatDuration(stats.durationSeconds));
      if (stats.avgSpeedMetersPerSecond || stats.avgSpeedMetersPerSecond === 0) {
        setText('[data-ride-speed="' + config.dataId + '"]', formatSpeedFromMps(stats.avgSpeedMetersPerSecond));
      } else {
        setText('[data-ride-speed="' + config.dataId + '"]', formatSpeed(stats.totalDistanceMeters, stats.durationSeconds));
      }

      if (stats.avgHeartRateBpm) {
        var hrMeta = 'Avg ' + formatBpm(stats.avgHeartRateBpm);
        if (stats.maxHeartRateBpm) hrMeta += ' · Max ' + formatBpm(stats.maxHeartRateBpm);
        setText('[data-ride-hr="' + config.dataId + '"]', hrMeta);
      }

      if (stats.avgSpeedMetersPerSecond || stats.maxSpeedMetersPerSecond) {
        var spMeta = 'Avg ' + formatSpeedFromMps(stats.avgSpeedMetersPerSecond || 0);
        if (stats.maxSpeedMetersPerSecond) spMeta += ' · Max ' + formatSpeedFromMps(stats.maxSpeedMetersPerSecond);
        setText('[data-ride-speed-meta="' + config.dataId + '"]', spMeta);
      }

      if (stats.startTime && stats.endTime) {
        var startDate = new Date(stats.startTime);
        var endDate = new Date(stats.endTime);
        var caption = startDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
        caption += ' · ' + startDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
        caption += ' → ' + endDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
        setText('[data-ride-dates="' + config.dataId + '"]', caption);
      }

      var bbox = stats.bbox || [
        data.points.reduce(function (m, p) { return Math.min(m, p.lon); }, data.points[0].lon),
        data.points.reduce(function (m, p) { return Math.min(m, p.lat); }, data.points[0].lat),
        data.points.reduce(function (m, p) { return Math.max(m, p.lon); }, data.points[0].lon),
        data.points.reduce(function (m, p) { return Math.max(m, p.lat); }, data.points[0].lat)
      ];

      drawRide(data.points, bbox);

      if (data.series) {
        drawSparkline(document.getElementById(config.hrCanvasId), data.series.heartRateBpm || [], 'rgba(27, 77, 62, 0.9)');
        drawSparkline(document.getElementById(config.speedCanvasId), data.series.speedMetersPerSecond || [], 'rgba(27, 77, 62, 0.7)');
      }

      window.addEventListener('resize', function () {
        drawRide(data.points, bbox);
        if (data.series) {
          drawSparkline(document.getElementById(config.hrCanvasId), data.series.heartRateBpm || [], 'rgba(27, 77, 62, 0.9)');
          drawSparkline(document.getElementById(config.speedCanvasId), data.series.speedMetersPerSecond || [], 'rgba(27, 77, 62, 0.7)');
        }
      });
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
      mapImageId: 'ride-map',
      hrCanvasId: 'ride-hr',
      speedCanvasId: 'ride-speed',
      dataId: 'morning-ride',
      inlineId: 'ride-data',
      fetchUrl: 'data/morning-ride.json'
    },
    {
      mapImageId: 'hike-map',
      hrCanvasId: 'hike-hr',
      speedCanvasId: 'hike-speed',
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
