/* Small shared helpers. Everything hangs off window.U so the other files stay plain scripts. */
(function () {
  'use strict';

  const params = new URLSearchParams(location.search);
  // ?fast=1 shortens every animation (handy for testing).
  const SPEED = params.has('speed') ? Math.max(0.05, parseFloat(params.get('speed')) || 1) : params.has('fast') ? 0.12 : 1;

  const U = {
    SPEED,
    ms: (x) => Math.max(16, Math.round(x * SPEED)),
    rand: (a, b) => a + Math.random() * (b - a),
    randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    chance: (p) => Math.random() < p,
    clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
    lerp: (a, b, t) => a + (b - a) * t,
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    wait: (msVal) => new Promise((r) => setTimeout(r, U.ms(msVal))),
    ease: {
      linear: (t) => t,
      inOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
      out: (t) => 1 - (1 - t) * (1 - t),
      in: (t) => t * t,
      outBack: (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
      outElastic: (t) => (t === 0 || t === 1) ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1,
      inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    },
    /** Drive onUpdate(easedT, rawT) for `dur` ms. Resolves when finished. */
    tween(dur, onUpdate, easing) {
      easing = easing || U.ease.inOut;
      dur = U.ms(dur);
      return new Promise((resolve) => {
        const t0 = performance.now();
        function frame(now) {
          const raw = Math.min(1, (now - t0) / dur);
          onUpdate(easing(raw), raw);
          if (raw < 1) requestAnimationFrame(frame); else resolve();
        }
        requestAnimationFrame(frame);
      });
    },
    /** Create an SVG element with attributes. */
    svg(tag, attrs, children) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
      if (attrs) for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) el.setAttribute(k, attrs[k]);
      if (children) for (const c of children) if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      return el;
    },
    /** Hex color helpers */
    hexToRgb(hex) {
      const h = hex.replace('#', '');
      const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    },
    rgbToHex(r, g, b) {
      return '#' + [r, g, b].map((v) => Math.round(U.clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
    },
    /** amount in [-1,1]: negative darkens toward black, positive lightens toward white */
    shade(hex, amount) {
      const [r, g, b] = U.hexToRgb(hex);
      const t = amount < 0 ? 0 : 255;
      const p = Math.abs(amount);
      return U.rgbToHex(r + (t - r) * p, g + (t - g) * p, b + (t - b) * p);
    },
    mix(hexA, hexB, t) {
      const a = U.hexToRgb(hexA), b = U.hexToRgb(hexB);
      return U.rgbToHex(U.lerp(a[0], b[0], t), U.lerp(a[1], b[1], t), U.lerp(a[2], b[2], t));
    },
    formatMoney(n) {
      if (Number.isInteger(n)) return '$' + n;
      return '$' + n.toFixed(2).replace(/\.?0+$/, '');
    },
    $: (sel) => document.querySelector(sel),
    $$: (sel) => Array.from(document.querySelectorAll(sel)),
  };

  window.U = U;
})();
