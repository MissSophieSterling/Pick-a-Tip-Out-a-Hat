/* Order-based weighted tip selection. Pure maths: no DOM, no audio, no timers.
   Loads as window.TipMath in the browser and as a CommonJS module under Node (for the tests).

   The hat leans toward 10% to 20% of the order:
     preferred  (10%..20% of the order, inclusive)        80% of the probability, shared equally
     ordinary   (everything else that is not an outlier)  19%, shared equally
     outlier    ($40 and up, and more than 20% of order)   1%, weighted 1/A^2 so bigger ones are rarer
   Empty groups hand their share on (see masses()), so every eligible amount keeps a positive chance.
   Boundaries use integer cents: A is preferred when A*100*10 >= C and A*100*5 <= C. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TipMath = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const AMOUNTS = [];
  for (let a = 1; a <= 35; a++) AMOUNTS.push(a);
  AMOUNTS.push(40, 45, 50, 60, 70, 80, 90, 100);
  Object.freeze(AMOUNTS);

  const SHARE = { preferred: 0.80, ordinary: 0.19, outlier: 0.01 };
  const MAX_CENTS = 999999999; // $9,999,999.99 is plenty for a food order

  /** Dollars (number or text) to integer cents. Returns null for anything that is not a positive amount with at most two decimals. */
  function toCents(total) {
    if (typeof total === 'string') {
      const t = total.trim().replace(/^\$/, '').replace(/,/g, '');
      const m = /^(\d*)(?:\.(\d{0,2}))?$/.exec(t);
      if (!m || (m[1] === '' && !m[2])) return null;
      const cents = Number(m[1] || '0') * 100 + Number((m[2] || '').padEnd(2, '0'));
      return cents > 0 && cents <= MAX_CENTS ? cents : null;
    }
    if (typeof total !== 'number' || !Number.isFinite(total) || total <= 0) return null;
    const cents = Math.round(total * 100);
    if (Math.abs(total * 100 - cents) > 1e-6) return null; // more than two decimals
    return cents > 0 && cents <= MAX_CENTS ? cents : null;
  }

  /** User-facing parse: { cents } or { error } with a short message. */
  function parseOrderTotal(text) {
    const raw = String(text == null ? '' : text).trim();
    if (!raw) return { error: 'Enter the order amount.' };
    const t = raw.replace(/^\$/, '').replace(/,/g, '');
    if (!/^\d*\.?\d*$/.test(t) || t === '.' || t === '') return { error: 'Numbers only, like 42.50.' };
    if (/\.\d{3,}/.test(t)) return { error: 'Cents only: two decimals at most.' };
    const cents = toCents(t);
    if (cents === null) {
      const n = Number(t);
      if (n <= 0) return { error: 'Needs to be more than $0.' };
      return { error: 'That is a very big order. Keep it under $10,000,000.' };
    }
    return { cents };
  }

  function normalizeAmounts(list) {
    const out = [];
    for (const v of list || AMOUNTS) {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0 && !out.includes(n)) out.push(n);
    }
    out.sort((a, b) => a - b);
    if (!out.length) throw new RangeError('No eligible tip amounts.');
    return out;
  }

  /** Split the amounts into the three groups for an order of `cents`. Integer comparisons only. */
  function groups(cents, amounts) {
    const preferred = [], ordinary = [], outlier = [];
    for (const a of amounts) {
      const tipCents = Math.round(a * 100);
      if (tipCents * 10 >= cents && tipCents * 5 <= cents) preferred.push(a);
      else if (a >= 40 && tipCents * 5 > cents) outlier.push(a);
      else ordinary.push(a);
    }
    return { preferred, ordinary, outlier };
  }

  /** Group masses after the empty-group rules, applied in this order:
      1. no preferred amounts: its 80% goes to ordinary
      2. no outliers: its 1% goes to ordinary
      3. no ordinary amounts: its share goes to preferred if there are any, else to the outliers */
  function masses(g) {
    let p = SHARE.preferred, o = SHARE.ordinary, h = SHARE.outlier;
    if (!g.preferred.length) { o += p; p = 0; }
    if (!g.outlier.length) { o += h; h = 0; }
    if (!g.ordinary.length) { if (g.preferred.length) p += o; else h += o; o = 0; }
    return { preferred: p, ordinary: o, outlier: h };
  }

  function checkCents(cents) {
    if (!Number.isInteger(cents) || cents <= 0) throw new RangeError('Order total must be a positive whole number of cents.');
  }

  /** Every amount with its probability: [{ amount, p, group }], preferred first, then ordinary, then outliers, ascending within each. */
  function distribution(cents, amounts) {
    checkCents(cents);
    const list = normalizeAmounts(amounts);
    const g = groups(cents, list), m = masses(g);
    const rows = [];
    for (const a of g.preferred) rows.push({ amount: a, p: m.preferred / g.preferred.length, group: 'preferred' });
    for (const a of g.ordinary) rows.push({ amount: a, p: m.ordinary / g.ordinary.length, group: 'ordinary' });
    if (g.outlier.length) {
      const wsum = g.outlier.reduce((s, a) => s + 1 / (a * a), 0);
      for (const a of g.outlier) rows.push({ amount: a, p: m.outlier * (1 / (a * a)) / wsum, group: 'outlier' });
    }
    const total = rows.reduce((s, r) => s + r.p, 0); // normalise away any float drift
    for (const r of rows) r.p /= total;
    return rows;
  }

  /** The 10%..20% window for the order, in dollars: { low, high }. */
  function preferredRange(cents) {
    checkCents(cents);
    return { low: cents / 1000, high: cents / 500 };
  }

  /** Uniform [0, 1) from a cryptographic source when there is one. */
  function random() {
    let c = null;
    try { c = (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) ? globalThis.crypto : null; } catch (e) { c = null; }
    if (!c && typeof require === 'function') { try { c = require('crypto').webcrypto || null; } catch (e) { c = null; } }
    if (c) { const a = new Uint32Array(1); c.getRandomValues(a); return a[0] / 4294967296; }
    return Math.random();
  }

  /** One weighted pick. opts.random (returning [0,1)) makes it deterministic; opts.amounts overrides the list. */
  function select(cents, opts) {
    const o = opts || {};
    const rows = distribution(cents, o.amounts);
    const u = (o.random || random)();
    let acc = 0;
    for (const r of rows) { acc += r.p; if (acc > u) return r.amount; }
    return rows[rows.length - 1].amount; // float rounding fallback
  }

  return { AMOUNTS, SHARE, toCents, parseOrderTotal, groups, masses, distribution, preferredRange, select, random };
});
