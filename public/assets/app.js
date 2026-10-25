/* Rebound site: theme toggle, copy buttons, bot faces, the face picker and the docs outline. Vanilla JS. */
(function () {
  'use strict';

  var THEME_KEY = 'rebound-theme';
  var COLORS = ['mint', 'coral', 'sky', 'lemon', 'grape', 'peach', 'rose', 'slate'];
  var EYES = ['round', 'happy', 'sleepy', 'wink', 'wide', 'dots', 'shades'];
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  /* ---------- theme ---------- */

  var systemLight = window.matchMedia('(prefers-color-scheme: light)');

  function currentTheme() {
    var forced = document.documentElement.getAttribute('data-theme');
    if (forced === 'light' || forced === 'dark') return forced;
    return systemLight.matches ? 'light' : 'dark';
  }

  /* <picture> sources follow the system scheme by default; a picked theme pins them. */
  function syncPictures() {
    var forced = document.documentElement.getAttribute('data-theme');
    $all('source[data-scheme]').forEach(function (s) {
      var scheme = s.getAttribute('data-scheme');
      s.media = forced ? (scheme === forced ? 'all' : 'not all') : '(prefers-color-scheme: ' + scheme + ')';
    });
  }

  function syncToggle() {
    var btn = $('#theme-toggle');
    if (!btn) return;
    btn.setAttribute('aria-label', currentTheme() === 'light' ? 'switch to dark theme' : 'switch to light theme');
  }

  function initTheme() {
    syncPictures();
    syncToggle();
    var btn = $('#theme-toggle');
    if (btn) {
      btn.addEventListener('click', function () {
        var next = currentTheme() === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', next);
        try {
          localStorage.setItem(THEME_KEY, next);
        } catch (e) {}
        syncPictures();
        syncToggle();
      });
    }
    systemLight.addEventListener('change', syncToggle);
  }

  /* ---------- copy ---------- */

  function initCopy() {
    $all('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var text = btn.getAttribute('data-copy');
        var done = function () {
          btn.textContent = 'copied';
          setTimeout(function () {
            btn.textContent = 'copy';
          }, 1600);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () {});
        }
      });
    });
  }

  /* ---------- bots ---------- */

  /* One happy bounce, as when you hover a card in the app. */
  function bounce(svg) {
    if (reduceMotion.matches) return;
    svg.classList.remove('bot-avatar--happy');
    void svg.getBoundingClientRect();
    svg.classList.add('bot-avatar--happy');
  }

  function initBots() {
    window.ReboundBlob.drawAll();

    $all('.stage-bot').forEach(function (svg) {
      svg.addEventListener('pointerenter', function () {
        bounce(svg);
      });
      svg.addEventListener('animationend', function (e) {
        if (e.animationName === 'bot-bounce') svg.classList.remove('bot-avatar--happy');
      });
    });
    $all('.bot-card').forEach(function (card) {
      var svg = $('svg', card);
      card.addEventListener('pointerenter', function () {
        bounce(svg);
      });
      svg.addEventListener('animationend', function (e) {
        if (e.animationName === 'bot-bounce') svg.classList.remove('bot-avatar--happy');
      });
    });

    /* The hero bots glance toward the pointer. */
    var stage = $('.stage');
    if (stage && !reduceMotion.matches) {
      var eyes = $all('.stage-bot .bot-avatar__eyes');
      var frame = 0;
      window.addEventListener('pointermove', function (e) {
        if (frame) return;
        frame = requestAnimationFrame(function () {
          frame = 0;
          eyes.forEach(function (g) {
            var svg = g.ownerSVGElement;
            var r = svg.getBoundingClientRect();
            var dx = e.clientX - (r.left + r.width / 2);
            var dy = e.clientY - (r.top + r.height / 2);
            var len = Math.sqrt(dx * dx + dy * dy) || 1;
            var reach = svg.viewBox.baseVal.width * 0.035;
            var k = Math.min(1, len / 400);
            g.style.transform =
              'translate(' + ((dx / len) * reach * k).toFixed(2) + 'px,' + ((dy / len) * reach * k * 0.7).toFixed(2) + 'px)';
          });
        });
      });
    }
  }

  /* ---------- face picker ---------- */

  function randomSeed() {
    return Math.floor(Math.random() * 2147483647);
  }

  function radioGroup(container, values, render, current, onPick) {
    container.setAttribute('role', 'radiogroup');
    var buttons = values.map(function (value) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-label', value);
      btn.title = value;
      render(btn, value);
      btn.addEventListener('click', function () {
        onPick(value);
        sync(value);
      });
      container.appendChild(btn);
      return btn;
    });
    function sync(value) {
      buttons.forEach(function (b) {
        var on = b.getAttribute('aria-label') === value;
        b.setAttribute('aria-checked', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
      });
    }
    /* Arrow keys move the choice, as in any radio group. */
    container.addEventListener('keydown', function (e) {
      var i = buttons.indexOf(document.activeElement);
      if (i < 0) return;
      var step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      var next = buttons[(i + step + buttons.length) % buttons.length];
      next.focus();
      next.click();
    });
    sync(current);
    return sync;
  }

  function initMaker() {
    var form = $('#maker');
    if (!form) return;
    var face = $('#maker-face');
    var title = $('#maker-title');
    var name = $('#maker-name');
    var seedLabel = $('#maker-seed');
    var state = { shape: 48213, color: 'peach', eyes: 'happy' };
    var eyeSvgs = [];

    function render() {
      window.ReboundBlob.draw(face, state);
      var n = name.value.trim() || 'Your bot';
      title.textContent = n;
      face.setAttribute('aria-label', n + ', a ' + state.color + ' blob with ' + state.eyes + ' eyes');
      seedLabel.textContent = 'seed ' + state.shape;
      eyeSvgs.forEach(function (pair) {
        window.ReboundBlob.draw(pair.svg, { shape: state.shape, color: state.color, eyes: pair.eyes });
      });
    }

    radioGroup($('#maker-colors'), COLORS, function (btn, c) {
      btn.className = 'swatch';
      var dot = document.createElement('span');
      dot.style.background =
        'radial-gradient(circle at 38% 32%, var(--bot-' + c + '-body) 55%, var(--bot-' + c + '-shade))';
      btn.appendChild(dot);
    }, state.color, function (c) {
      state.color = c;
      render();
    });

    radioGroup($('#maker-eyes'), EYES, function (btn, eyes) {
      btn.className = 'eye-pick';
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      svg.dataset.still = '1';
      btn.appendChild(svg);
      eyeSvgs.push({ svg: svg, eyes: eyes });
    }, state.eyes, function (eyes) {
      state.eyes = eyes;
      render();
      bounce(face);
    });

    $('#maker-shuffle').addEventListener('click', function () {
      state.shape = randomSeed();
      render();
      bounce(face);
    });
    face.addEventListener('animationend', function (e) {
      if (e.animationName === 'bot-bounce') face.classList.remove('bot-avatar--happy');
    });
    name.addEventListener('input', render);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
    });
    render();
  }

  /* ---------- docs outline ---------- */

  function initToc() {
    var links = $all('.docs-toc a');
    if (!links.length || !('IntersectionObserver' in window)) return;
    var byId = {};
    links.forEach(function (a) {
      byId[a.getAttribute('href').slice(1)] = a;
    });
    var visible = {};
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          visible[en.target.id] = en.isIntersecting;
        });
        var first = links.filter(function (a) {
          return visible[a.getAttribute('href').slice(1)];
        })[0];
        if (!first) return;
        links.forEach(function (a) {
          if (a === first) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      },
      { rootMargin: '-72px 0px -55% 0px' }
    );
    Object.keys(byId).forEach(function (id) {
      var section = document.getElementById(id);
      if (section) io.observe(section);
    });
  }

  initTheme();
  initCopy();
  initBots();
  initMaker();
  initToc();
})();
