const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../js/tipmath.js');

const close = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const rowsFor = (dollars, amounts) => T.distribution(T.toCents(dollars), amounts);
const byAmount = (rows) => Object.fromEntries(rows.map((r) => [r.amount, r]));

test('the eligible list is the 43 whole-dollar amounts', () => {
  const expected = [...Array.from({ length: 35 }, (_, i) => i + 1), 40, 45, 50, 60, 70, 80, 90, 100];
  assert.deepEqual([...T.AMOUNTS], expected);
  assert.equal(T.AMOUNTS.length, 43);
});

test('toCents accepts positive amounts with at most two decimals', () => {
  assert.equal(T.toCents('50'), 5000);
  assert.equal(T.toCents('50.5'), 5050);
  assert.equal(T.toCents('50.55'), 5055);
  assert.equal(T.toCents('$1,234.56'), 123456);
  assert.equal(T.toCents(' 12 '), 1200);
  assert.equal(T.toCents('.5'), 50);
  assert.equal(T.toCents(19.99), 1999);
  assert.equal(T.toCents(0.1 + 0.2), 30); // float noise well under a cent is fine
  for (const bad of ['50.555', '0', '0.00', '-5', 'abc', '', '.', '1e3', '5-', NaN, Infinity, -1, 0, 1.005, 12.345, null, undefined, {}]) {
    assert.equal(T.toCents(bad), null, `should reject ${String(bad)}`);
  }
});

test('parseOrderTotal gives short messages', () => {
  assert.deepEqual(T.parseOrderTotal('42.50'), { cents: 4250 });
  assert.match(T.parseOrderTotal('').error, /Enter/);
  assert.match(T.parseOrderTotal('ten').error, /Numbers only/);
  assert.match(T.parseOrderTotal('1.234').error, /two decimals/);
  assert.match(T.parseOrderTotal('0').error, /more than \$0/);
  assert.match(T.parseOrderTotal('99999999999').error, /big order/);
});

test('$50 order: six preferred at 13.33%, 29 ordinary at 0.6552%, eight outliers sharing 1%', () => {
  const rows = rowsFor(50), m = byAmount(rows);
  const pref = rows.filter((r) => r.group === 'preferred'), ord = rows.filter((r) => r.group === 'ordinary'), out = rows.filter((r) => r.group === 'outlier');
  assert.deepEqual(pref.map((r) => r.amount), [5, 6, 7, 8, 9, 10]);
  assert.equal(ord.length, 29);
  assert.deepEqual(out.map((r) => r.amount), [40, 45, 50, 60, 70, 80, 90, 100]);
  for (const r of pref) assert.ok(close(r.p, 0.8 / 6), `preferred ${r.amount}`);
  for (const r of ord) assert.ok(close(r.p, 0.19 / 29), `ordinary ${r.amount}`);
  assert.ok(close(pref.reduce((s, r) => s + r.p, 0), 0.8));
  assert.ok(close(ord.reduce((s, r) => s + r.p, 0), 0.19));
  assert.ok(close(out.reduce((s, r) => s + r.p, 0), 0.01));
  assert.ok(close(m[40].p / m[100].p, 6.25));
  assert.ok(close(m[5].p, 0.133333333333), 'about 13.3333%');
  assert.ok(close(m[1].p, 0.006551724138, 1e-9), 'about 0.6552%');
  assert.equal(rows.length, 43);
});

test('boundaries are inclusive and compared in cents', () => {
  let m = byAmount(rowsFor(50));
  assert.equal(m[5].group, 'preferred');   // exactly 10%
  assert.equal(m[10].group, 'preferred');  // exactly 20%
  m = byAmount(rowsFor(49.99));
  assert.equal(m[5].group, 'preferred');
  assert.equal(m[10].group, 'ordinary');   // $10 is now over 20%
  m = byAmount(rowsFor(50.01));
  assert.equal(m[5].group, 'ordinary');    // $5 is now under 10%
  assert.equal(m[10].group, 'preferred');
  m = byAmount(rowsFor(400));
  assert.deepEqual(rowsFor(400).filter((r) => r.group === 'preferred').map((r) => r.amount), [40, 45, 50, 60, 70, 80]);
  assert.equal(m[90].group, 'outlier');
  assert.equal(m[35].group, 'ordinary');
  m = byAmount(rowsFor(500));
  assert.equal(m[100].group, 'preferred'); // $100 is preferred on a big enough order
});

test('empty preferred group hands its 80% to the ordinary group', () => {
  const rows = rowsFor(3), m = byAmount(rows);
  assert.equal(rows.filter((r) => r.group === 'preferred').length, 0);
  const ord = rows.filter((r) => r.group === 'ordinary'), out = rows.filter((r) => r.group === 'outlier');
  assert.equal(ord.length, 35);
  assert.equal(out.length, 8);
  assert.ok(close(ord.reduce((s, r) => s + r.p, 0), 0.99));
  assert.ok(close(out.reduce((s, r) => s + r.p, 0), 0.01));
  assert.ok(close(m[1].p, 0.99 / 35));
});

test('empty outlier group hands its 1% to the ordinary group', () => {
  const rows = rowsFor(5000);
  assert.equal(rows.filter((r) => r.group === 'outlier').length, 0);
  assert.equal(rows.filter((r) => r.group === 'preferred').length, 0);
  for (const r of rows) assert.ok(close(r.p, 1 / 43), `${r.amount} should be 1/43`);
});

test('empty ordinary group hands its share to preferred, else to the outliers', () => {
  let rows = rowsFor(60, [7, 11]); // both inside 10%..20% of $60
  assert.deepEqual(rows.map((r) => [r.amount, r.group]), [[7, 'preferred'], [11, 'preferred']]);
  for (const r of rows) assert.ok(close(r.p, 0.5));
  rows = rowsFor(1, [40, 100]); // nothing preferred, nothing ordinary: all of it goes to the outliers
  assert.deepEqual(rows.map((r) => r.group), ['outlier', 'outlier']);
  const w40 = 1 / 1600, w100 = 1 / 10000;
  assert.ok(close(rows[0].p, w40 / (w40 + w100)));
  assert.ok(close(rows[1].p, w100 / (w40 + w100)));
});

test('probabilities always sum to one and every amount stays possible', () => {
  const totals = [0.01, 0.5, 1, 3, 9.99, 10, 25, 49.99, 50, 50.01, 99, 100, 250, 399.99, 400, 500, 999, 1000, 5000, 123456.78];
  for (const t of totals) {
    const rows = rowsFor(t);
    assert.equal(rows.length, 43, `$${t}: 43 rows`);
    assert.ok(close(rows.reduce((s, r) => s + r.p, 0), 1, 1e-12), `$${t}: sums to 1`);
    for (const r of rows) assert.ok(r.p > 0, `$${t}: $${r.amount} must stay possible`);
    const seen = new Set(rows.map((r) => r.amount));
    for (const a of T.AMOUNTS) assert.ok(seen.has(a), `$${t}: $${a} present`);
  }
});

test('rows come preferred, ordinary, outlier, ascending within each group', () => {
  const rows = rowsFor(50);
  const order = { preferred: 0, ordinary: 1, outlier: 2 };
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1], b = rows[i];
    assert.ok(order[a.group] < order[b.group] || (a.group === b.group && a.amount < b.amount), `row ${i}`);
  }
});

test('selection is deterministic with an injected random source', () => {
  const cents = 5000;
  assert.equal(T.select(cents, { random: () => 0 }), 5);              // first preferred
  assert.equal(T.select(cents, { random: () => 0.79999 }), 10);        // last preferred
  assert.equal(T.select(cents, { random: () => 0.800001 }), 1);        // first ordinary
  assert.equal(T.select(cents, { random: () => 0.99 }), 40);           // first outlier starts at 0.99
  assert.equal(T.select(cents, { random: () => 0.9999999 }), 100);     // last outlier
  assert.equal(T.select(cents, { random: () => 1 - Number.EPSILON }), 100); // rounding fallback
  // the cumulative walk matches the distribution
  const rows = T.distribution(cents);
  let acc = 0;
  for (const r of rows) { const u = acc + r.p / 2; assert.equal(T.select(cents, { random: () => u }), r.amount); acc += r.p; }
  // and a custom list
  assert.equal(T.select(6000, { random: () => 0.6, amounts: [7, 11] }), 11);
});

test('the default random source is uniform-ish and in [0, 1)', () => {
  let min = 1, max = 0;
  for (let i = 0; i < 2000; i++) { const u = T.random(); assert.ok(u >= 0 && u < 1); min = Math.min(min, u); max = Math.max(max, u); }
  assert.ok(min < 0.05 && max > 0.95);
});

test('long-run frequencies follow the distribution', () => {
  const cents = 5000, n = 200000, counts = {};
  for (let i = 0; i < n; i++) { const a = T.select(cents); counts[a] = (counts[a] || 0) + 1; }
  const m = byAmount(T.distribution(cents));
  const pref = [5, 6, 7, 8, 9, 10].reduce((s, a) => s + counts[a], 0) / n;
  assert.ok(Math.abs(pref - 0.8) < 0.01, `preferred share ${pref}`);
  assert.ok(Math.abs(counts[1] / n - m[1].p) < 0.002, `ordinary $1 ${counts[1] / n}`);
});

test('invalid inputs throw', () => {
  for (const bad of [0, -100, 12.5, NaN, Infinity, '5000', null]) assert.throws(() => T.distribution(bad), RangeError, String(bad));
  assert.throws(() => T.distribution(5000, []), RangeError);
});

test('preferredRange reports the window in dollars', () => {
  assert.deepEqual(T.preferredRange(5000), { low: 5, high: 10 });
  assert.deepEqual(T.preferredRange(4999), { low: 4.999, high: 9.998 });
});
