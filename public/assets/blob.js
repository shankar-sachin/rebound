/* Rebound bot avatars for the web: a soft blob with eyes, drawn from a seed.
   A plain-JS port of Bouncer's own avatar code (packages/core/src/bots/blob.ts and
   apps/desktop/src/renderer/src/ui/bots/BotAvatar.tsx), so a seed draws the same bot here as in the app.
   Colors are the --bot-* tokens in style.css, never raw hex. */
(function () {
  'use strict';

  var SVG = 'http://www.w3.org/2000/svg';
  var uid = 0;

  /* A small seeded PRNG (mulberry32). Returns floats in [0, 1). */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function round(v) {
    return Math.round(v * 100) / 100;
  }

  function blobPoints(seed, size) {
    var rand = mulberry32(seed);
    var n = 6 + Math.floor(rand() * 3);
    var minR = 0.82;
    var maxR = 1;
    var c = size * 0.5;
    var base = size * 0.42;
    var step = (2 * Math.PI) / n;
    var start = rand() * 2 * Math.PI;
    var points = [];
    for (var i = 0; i < n; i++) {
      var theta = start + step * i + (rand() - 0.5) * step * 0.33;
      var r = base * (minR + (maxR - minR) * rand());
      var s = Math.sin(theta);
      var widen = s > 0 ? 1 + 0.06 * s : 1;
      var squash = s > 0 ? 0.92 : 1;
      points.push([c + r * Math.cos(theta) * widen, c + r * s * squash]);
    }
    return points;
  }

  /* Catmull-Rom through the control points, as cubic Bézier segments. */
  function blobPath(seed, size) {
    var p = blobPoints(seed, size || 100);
    var n = p.length;
    function at(i) {
      return p[((i % n) + n) % n];
    }
    var d = 'M' + round(at(0)[0]) + ' ' + round(at(0)[1]);
    for (var i = 0; i < n; i++) {
      var a = at(i - 1), b = at(i), c = at(i + 1), e = at(i + 2);
      d +=
        'C' + round(b[0] + (c[0] - a[0]) / 6) + ' ' + round(b[1] + (c[1] - a[1]) / 6) +
        ' ' + round(c[0] - (e[0] - b[0]) / 6) + ' ' + round(c[1] - (e[1] - b[1]) / 6) +
        ' ' + round(c[0]) + ' ' + round(c[1]);
    }
    return d + 'Z';
  }

  function eyeLayout(seed) {
    var rand = mulberry32(seed ^ 0x9e3779b9);
    return { gap: round(0.94 + rand() * 0.12), lift: round(-1.5 + rand() * 3) };
  }

  function el(name, attrs, parent) {
    var node = document.createElementNS(SVG, name);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }

  var INK = 'fill: var(--bot-eye)';
  var INK_STROKE = 'stroke: var(--bot-eye)';
  var GLINT = 'fill: var(--bot-eye-shine)';

  function roundEye(g, x, y) {
    var eye = el('g', { class: 'bot-avatar__eye' }, g);
    el('ellipse', { cx: x, cy: y, rx: 5, ry: 6.2, style: INK }, eye);
    el('circle', { cx: x + 1.6, cy: y - 2.2, r: 1.8, style: GLINT }, eye);
  }

  function arcEye(g, x, y) {
    el('path', {
      d: 'M' + (x - 5.5) + ' ' + (y + 1.5) + ' Q' + x + ' ' + (y - 5.5) + ' ' + (x + 5.5) + ' ' + (y + 1.5),
      fill: 'none',
      'stroke-width': 3,
      'stroke-linecap': 'round',
      style: INK_STROKE,
    }, g);
  }

  /* Eyes sit on a shared baseline (y = 47 + lift) and spread by gap, centred on x = 50. */
  function drawEyes(g, eyes, gap, lift) {
    var y = 47 + lift;
    var half = 12.5 * gap;
    var xs = [50 - half, 50 + half];
    if (eyes === 'happy') {
      xs.forEach(function (x) { arcEye(g, x, y); });
    } else if (eyes === 'wink') {
      roundEye(g, xs[0], y);
      arcEye(g, xs[1], y);
    } else if (eyes === 'round') {
      xs.forEach(function (x) { roundEye(g, x, y); });
    } else if (eyes === 'wide') {
      xs.forEach(function (x) {
        var eye = el('g', { class: 'bot-avatar__eye' }, g);
        el('ellipse', { cx: x, cy: y, rx: 6.6, ry: 8, style: INK }, eye);
        el('circle', { cx: x + 2.2, cy: y - 3, r: 2.5, style: GLINT }, eye);
        el('circle', { cx: x - 2.4, cy: y + 3.4, r: 1, style: GLINT }, eye);
      });
    } else if (eyes === 'dots') {
      xs.forEach(function (x) {
        el('circle', { class: 'bot-avatar__eye', cx: x, cy: y, r: 2.6, style: INK }, g);
      });
    } else if (eyes === 'sleepy') {
      xs.forEach(function (x) {
        el('path', {
          class: 'bot-avatar__eye',
          d: 'M' + (x - 5.2) + ' ' + y + ' L' + (x + 5.2) + ' ' + y + ' A5.2 5.2 0 0 1 ' + (x - 5.2) + ' ' + y + ' Z',
          style: INK,
        }, g);
        el('path', {
          d: 'M' + (x - 6.4) + ' ' + (y - 0.4) + ' L' + (x + 6.4) + ' ' + (y - 0.4),
          'stroke-width': 1.8,
          'stroke-linecap': 'round',
          style: INK_STROKE,
        }, g);
      });
    } else {
      /* shades: two rounded lenses and a bridge. */
      el('line', {
        x1: xs[0] + 8.2, y1: y - 1, x2: xs[1] - 8.2, y2: y - 1,
        'stroke-width': 2, 'stroke-linecap': 'round', style: INK_STROKE,
      }, g);
      xs.forEach(function (x) {
        el('rect', { x: x - 8.6, y: y - 5.6, width: 17.2, height: 11.2, rx: 5.6, style: INK }, g);
        el('rect', { x: x - 5.4, y: y - 3.4, width: 4, height: 1.6, rx: 0.8, style: GLINT, opacity: 0.55 }, g);
      });
    }
  }

  /* The Rebound starter's face: Bouncer's orb with pill eyes, in the orb tokens. */
  function orb(svg) {
    svg.setAttribute('viewBox', '0 0 24 24');
    var id = 'orb' + ++uid;
    var defs = el('defs', {}, svg);
    var grad = el('radialGradient', { id: id, cx: 0.34, cy: 0.3, r: 0.78 }, defs);
    el('stop', { offset: 0, style: 'stop-color: var(--orb-light)' }, grad);
    el('stop', { offset: 0.42, style: 'stop-color: var(--orb)' }, grad);
    el('stop', { offset: 1, style: 'stop-color: var(--orb-deep)' }, grad);
    el('ellipse', { class: 'bot-avatar__ground', cx: 12, cy: 22.6, rx: 6.4, ry: 0.95 }, svg);
    var body = el('g', { class: 'bot-avatar__body' }, svg);
    el('circle', { cx: 12, cy: 12, r: 9.7, fill: 'url(#' + id + ')', 'stroke-width': 0.55, style: 'stroke: var(--orb-edge)' }, body);
    el('ellipse', { cx: 8.7, cy: 6.5, rx: 3.6, ry: 1.35, transform: 'rotate(-28 8.7 6.5)', opacity: 0.7, style: 'fill: var(--orb-light)' }, body);
    el('ellipse', { cx: 5.3, cy: 10.2, rx: 0.7, ry: 0.95, transform: 'rotate(-20 5.3 10.2)', opacity: 0.6, style: 'fill: var(--orb-light)' }, body);
    var eyes = el('g', { class: 'bot-avatar__eyes' }, body);
    [[10.4, 12.4], [15.9, 11.3]].forEach(function (p) {
      var x = p[0], y = p[1];
      var g = el('g', { transform: 'rotate(-6 ' + x + ' ' + y + ')' }, eyes);
      var eye = el('g', { class: 'bot-avatar__eye' }, g);
      el('rect', { x: x - 1.35, y: y - 2.45, width: 2.7, height: 4.9, rx: 1.35, style: 'fill: var(--orb-eye)' }, eye);
      el('circle', { cx: x - 0.35, cy: y - 1.35, r: 0.55, opacity: 0.9, style: 'fill: var(--orb-light)' }, eye);
      el('circle', { cx: x - 0.6, cy: y - 0.25, r: 0.22, opacity: 0.8, style: 'fill: var(--orb-light)' }, eye);
    });
  }

  /* Draws a bot into an <svg>. spec: { shape: number | 'bouncer', color, eyes }. */
  function draw(svg, spec) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.classList.add('bot-avatar');
    if (!svg.dataset.still) svg.classList.add('bot-avatar--animate');
    if (spec.shape === 'bouncer') return orb(svg);
    svg.setAttribute('viewBox', '0 0 100 100');
    var n = ++uid;
    var bodyId = 'bot-body-' + n, shineId = 'bot-shine-' + n, clipId = 'bot-clip-' + n;
    var d = blobPath(spec.shape, 100);
    var layout = eyeLayout(spec.shape);
    var c = spec.color;
    var defs = el('defs', {}, svg);
    var body = el('radialGradient', { id: bodyId, cx: '50%', cy: '50%', r: '62%', fx: '38%', fy: '32%' }, defs);
    el('stop', { offset: 0, style: 'stop-color: var(--bot-' + c + '-body)' }, body);
    el('stop', { offset: 0.62, style: 'stop-color: var(--bot-' + c + '-body)' }, body);
    el('stop', { offset: 1, style: 'stop-color: var(--bot-' + c + '-shade)' }, body);
    var shine = el('radialGradient', { id: shineId }, defs);
    el('stop', { offset: 0, style: 'stop-color: var(--bot-' + c + '-shine); stop-opacity: 0.95' }, shine);
    el('stop', { offset: 1, style: 'stop-color: var(--bot-' + c + '-shine); stop-opacity: 0' }, shine);
    var clip = el('clipPath', { id: clipId }, defs);
    el('path', { d: d }, clip);
    el('ellipse', { class: 'bot-avatar__ground', cx: 50, cy: 91, rx: 26, ry: 4 }, svg);
    var g = el('g', { class: 'bot-avatar__body' }, svg);
    el('path', { d: d, fill: 'url(#' + bodyId + ')' }, g);
    var clipped = el('g', { 'clip-path': 'url(#' + clipId + ')' }, g);
    el('ellipse', {
      class: 'bot-avatar__shine', cx: 36, cy: 30, rx: 17, ry: 11,
      transform: 'rotate(-20 36 30)', fill: 'url(#' + shineId + ')',
    }, clipped);
    drawEyes(el('g', { class: 'bot-avatar__eyes' }, g), spec.eyes, layout.gap, layout.lift);
  }

  /* Every <svg data-bot="shape color eyes"> on the page. */
  function drawAll(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll('svg[data-bot]'), function (svg) {
      var parts = svg.getAttribute('data-bot').split(' ');
      var shape = parts[0] === 'bouncer' ? 'bouncer' : parseInt(parts[0], 10);
      draw(svg, { shape: shape, color: parts[1], eyes: parts[2] });
    });
  }

  window.ReboundBlob = { draw: draw, drawAll: drawAll };
})();
