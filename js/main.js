// Global staging environment banner
(function () {
  if (window.location.hostname !== 'stg.alvin.id') return;
  if (document.getElementById('staging-banner')) return;

  var banner = document.createElement('div');
  banner.id = 'staging-banner';
  banner.textContent = 'STAGING - stg.alvin.id';
  banner.setAttribute(
    'style',
    'position:fixed;top:0;left:0;right:0;z-index:9999;background:#b45309;color:#fff;text-align:center;font-size:12px;font-family:monospace;padding:4px 0;letter-spacing:0.05em;line-height:1.2;'
  );
  document.body.insertBefore(banner, document.body.firstChild);
  document.body.style.paddingTop = '24px';
})();

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

  var galleryImages = Array.prototype.slice.call(document.querySelectorAll('.gallery-item img'));
  if (!galleryImages.length) return;

  var lightboxImg = lightbox.querySelector('img');
  var closeBtn = lightbox.querySelector('.lightbox-close');
  var prevBtn = lightbox.querySelector('.lightbox-prev');
  var nextBtn = lightbox.querySelector('.lightbox-next');
  var currentIndex = -1;
  var touchStartX = 0;
  var touchStartY = 0;
  var touchActive = false;

  function getFullSrc(img) {
    return img.getAttribute('data-full') || img.currentSrc || img.src;
  }

  function showAt(index) {
    var total = galleryImages.length;
    currentIndex = (index + total) % total;
    var img = galleryImages[currentIndex];
    lightboxImg.src = getFullSrc(img);
    lightboxImg.alt = img.alt || '';
  }

  function openAt(index) {
    showAt(index);
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  galleryImages.forEach(function (img, index) {
    var item = img.closest('.gallery-item');
    if (item) {
      item.addEventListener('click', function () {
        openAt(index);
      });
      item.setAttribute('tabindex', '0');
      item.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openAt(index);
        }
      });
    } else {
      img.addEventListener('click', function () {
        openAt(index);
      });
    }
  });

  function isOpen() {
    return lightbox.classList.contains('active');
  }

  function goPrev() {
    if (!isOpen()) return;
    showAt(currentIndex - 1);
  }

  function goNext() {
    if (!isOpen()) return;
    showAt(currentIndex + 1);
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      goPrev();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      goNext();
    });
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    lightboxImg.src = '';
    currentIndex = -1;
    document.body.style.overflow = '';
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      closeLightbox();
    });
  }

  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLightbox();
  });

  lightbox.addEventListener('touchstart', function (e) {
    if (!isOpen() || !e.touches || e.touches.length !== 1) return;
    var touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchActive = true;
  }, { passive: true });

  lightbox.addEventListener('touchend', function (e) {
    if (!touchActive || !isOpen() || !e.changedTouches || !e.changedTouches.length) return;
    var touch = e.changedTouches[0];
    var deltaX = touch.clientX - touchStartX;
    var deltaY = touch.clientY - touchStartY;
    var absX = Math.abs(deltaX);
    var absY = Math.abs(deltaY);
    var minSwipeDistance = 40;
    var horizontalRatio = 1.2;

    if (absX > minSwipeDistance && absX > absY * horizontalRatio) {
      if (deltaX < 0) {
        goNext();
      } else {
        goPrev();
      }
    }

    touchActive = false;
  }, { passive: true });

  lightbox.addEventListener('touchcancel', function () {
    touchActive = false;
  }, { passive: true });

  document.addEventListener('keydown', function (e) {
    if (!isOpen()) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') goPrev();
    if (e.key === 'ArrowRight') goNext();
  });
})();

(function () {
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
