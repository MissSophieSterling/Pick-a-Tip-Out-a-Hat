/* Game flow, screens, and the settings drawer. */
(function () {
  'use strict';
  const { $, $$, rand, randInt, pick, wait, tween, ease, svg, ms, formatMoney, shuffle, clamp } = U;
  const S = Settings;

  /* ---------------- DOM ---------------- */
  const screens = { home: $('#screen-home'), stage: $('#screen-stage') };
  const layerHand = $('#layer-hand'), layerFlying = $('#layer-flying'), layerDesk = $('#layer-desk'), layerClock = $('#layer-clock');
  const hatGroup = $('#hat-group'), slotInside = $('#hand-slot-inside'), slotFront = $('#hand-slot-front');
  const bannerText = $('#banner-text'), bannerSub = $('#banner-sub');
  const vignette = $('#vignette');
  const result = $('#result'), resultCard = $('#result-card'), canvas = $('#celebration'), crackers = $('#crackers');
  const HAT = { x: 185, y: 445 };

  /* ---------------- state ---------------- */
  let look = Hand.makeLook(S.get().setSkin ? S.skinHex() : null, S.get().hand, null);
  let stageRig = null, previewRig = null, miniRig = null, stageHat = null, previewHat = null;
  let runId = 0;              // bump to cancel an in-flight round
  let game = null;            // { pool, bonusLeft, lastSlip, total }
  let idleRaf = 0;
  let tickTimer = null;
  let stageDirty = false;
  let currentScreen = 'home';
  let clockHand = null, clockG = null, clockAngle = 0;

  class Cancelled extends Error {}
  const check = (run) => { if (run !== runId) throw new Cancelled('cancelled'); };

  /* ---------------- building ---------------- */
  function buildPreview() {
    const ph = $('#preview-hat');
    while (ph.firstChild) ph.removeChild(ph.firstChild);
    const back = svg('g'), front = svg('g');
    previewHat = Hat.create(back, front, S.hatHex());
    const wrap = svg('g', { transform: 'translate(200,290) scale(0.95)' });
    wrap.appendChild(back); wrap.appendChild(front);
    ph.appendChild(wrap);
    for (let i = 0; i < 9; i++) previewHat.addSlip();
    previewRig = Hand.create($('#preview-hand'), look);
    previewRig.setPose({ x: 196, y: 58, rot: 4, scale: 1, curl: Hand.POSES.relaxed.curl.slice(), thumb: Hand.POSES.relaxed.thumb });
  }
  function buildMini() {
    miniRig = Hand.create($('#mini-hand'), look);
    miniRig.setPose({ x: 100, y: 125, rot: 0, scale: 0.95, curl: Hand.POSES.open.curl.slice(), thumb: Hand.POSES.open.thumb });
  }
  function buildStage() {
    stageHat = Hat.create($('#hat-back'), $('#hat-front'), S.hatHex());
    hatGroup.setAttribute('transform', `translate(${HAT.x},${HAT.y})`);
    const g = stageRig ? stageRig.group : svg('g', { id: 'stage-hand' });
    if (!g.parentNode) layerHand.appendChild(g);
    stageRig = Hand.create(g, look);
    stageRig.setPose({ x: 330, y: -420, rot: 0, scale: 1 });
    buildClock();
    stageDirty = false;
  }
  function buildClock() {
    while (layerClock.firstChild) layerClock.removeChild(layerClock.firstChild);
    const outer = svg('g', { transform: 'translate(330,92)' });
    clockG = svg('g', { class: 'clock-inner' });
    outer.appendChild(clockG);
    [[-24, -36], [24, -36]].forEach(([x, y]) => {
      clockG.appendChild(svg('line', { x1: x * 0.6, y1: y + 14, x2: x, y2: y, stroke: '#333', 'stroke-width': 5, 'stroke-linecap': 'round' }));
      clockG.appendChild(svg('circle', { cx: x, cy: y, r: 10, fill: '#C4B0A6', stroke: '#6B5548', 'stroke-width': 2 }));
    });
    clockG.appendChild(svg('circle', { cx: 0, cy: 0, r: 42, fill: '#FF4514', stroke: '#8A3C20', 'stroke-width': 3 }));
    clockG.appendChild(svg('circle', { cx: 0, cy: 0, r: 34, fill: '#F3EAE4', stroke: '#110E0B', 'stroke-width': 2 }));
    for (let k = 0; k < 12; k++) clockG.appendChild(svg('line', { x1: 0, y1: -30, x2: 0, y2: k % 3 === 0 ? -23 : -26, stroke: '#222', 'stroke-width': k % 3 === 0 ? 3 : 1.6, transform: `rotate(${k * 30})` }));
    clockG.appendChild(svg('line', { x1: 0, y1: 4, x2: 0, y2: -16, stroke: '#222', 'stroke-width': 4, 'stroke-linecap': 'round', transform: 'rotate(300)' }));
    clockG.appendChild(svg('line', { x1: 0, y1: 4, x2: 0, y2: -24, stroke: '#222', 'stroke-width': 3, 'stroke-linecap': 'round', transform: 'rotate(60)' }));
    clockHand = svg('line', { x1: 0, y1: 8, x2: 0, y2: -29, stroke: '#FF4514', 'stroke-width': 2, 'stroke-linecap': 'round' });
    clockG.appendChild(clockHand);
    clockG.appendChild(svg('circle', { cx: 0, cy: 0, r: 3, fill: '#222' }));
    layerClock.appendChild(outer);
    clockAngle = 0;
  }
  function rebuildHands() {
    buildPreview(); buildMini();
    if (currentScreen === 'stage') stageDirty = true; else buildStage();
  }
  function rebuildHats() {
    buildPreview();
    if (currentScreen === 'stage') stageDirty = true; else buildStage();
  }

  /* ---------------- sparkles ---------------- */
  const STAR4 = 'M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z';
  const STAR5 = 'M12 1.5 L14.9 8.6 L22.5 9.2 L16.7 14.1 L18.5 21.5 L12 17.5 L5.5 21.5 L7.3 14.1 L1.5 9.2 L9.1 8.6 Z';
  function starEl(cls) {
    const s = svg('svg', { viewBox: '0 0 24 24', class: cls });
    s.appendChild(svg('path', { d: Math.random() < 0.6 ? STAR4 : STAR5 }));
    s.style.setProperty('--tone', `var(--star-${pick(['a', 'b', 'c', 'd'])})`);
    return s;
  }
  /** Twinkling stars of different sizes, shapes and tones around the title. */
  function buildStars() {
    const layer = $('#title-stars');
    layer.innerHTML = '';
    for (let i = 0; i < 18; i++) {
      const s = starEl('star');
      const size = rand(9, 34);
      s.style.width = size + 'px'; s.style.height = size + 'px';
      s.style.left = rand(0, 96) + '%'; s.style.top = rand(0, 90) + '%';
      s.style.setProperty('--dur', rand(1.3, 3.2).toFixed(2) + 's');
      s.style.setProperty('--delay', rand(0, 3).toFixed(2) + 's');
      layer.appendChild(s);
    }
  }
  /** A small burst of stars around the draw button. */
  function starBurst() {
    const box = $('#draw-burst');
    box.innerHTML = '';
    for (let i = 0; i < 14; i++) {
      const s = starEl('spark');
      const a = (i / 14) * Math.PI * 2 + rand(-0.3, 0.3), d = rand(70, 150);
      s.style.setProperty('--dx', (Math.cos(a) * d).toFixed(0) + 'px');
      s.style.setProperty('--dy', (Math.sin(a) * d * 0.7).toFixed(0) + 'px');
      s.style.left = rand(15, 85) + '%';
      box.appendChild(s);
    }
    setTimeout(() => { box.innerHTML = ''; }, 900);
  }

  /* ---------------- screens ---------------- */
  function showScreen(name) {
    currentScreen = name;
    for (const k in screens) screens[k].classList.toggle('active', k === name);
    $('#btn-home').hidden = name === 'home';
    if (name === 'home') startIdle(); else stopIdle();
    window.scrollTo(0, 0);
  }
  function startIdle() {
    stopIdle();
    const t0 = performance.now();
    const loop = (now) => {
      const t = (now - t0) / 1000;
      if (previewRig) previewRig.setPose({ y: 58 + Math.sin(t * 1.6) * 9, rot: 4 + Math.sin(t * 1.1) * 3 });
      idleRaf = requestAnimationFrame(loop);
    };
    idleRaf = requestAnimationFrame(loop);
  }
  function stopIdle() { if (idleRaf) cancelAnimationFrame(idleRaf); idleRaf = 0; }

  function setBanner(text, sub, emoji) {
    bannerText.textContent = S.isParty() && emoji ? `${text} ${emoji}` : text;
    bannerSub.textContent = sub || '';
    bannerText.classList.remove('bump'); void bannerText.offsetWidth; bannerText.classList.add('bump');
  }
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  /** The home screen's description of what is in the hat, from the current settings. */
  function updateHomeText() {
    const s = S.get();
    const min = formatMoney(Math.min(...s.amounts)), max = formatMoney(Math.max(...s.amounts));
    $('#hat-text').textContent = `${s.amounts.length} amounts, ${min} to ${max}. Which one comes up leans on what the order cost.`;
    const extras = [];
    if (s.wild) extras.push(`${plural(s.wild, 'wild card')} where you name the tip`);
    if (s.chooseAgain) extras.push(`${plural(s.chooseAgain, 'blank slip')} that send you back in`);
    if (s.bonus) extras.push(`${plural(s.bonus, 'bonus slip')} worth 1 to ${s.bonus} extra draws`);
    let odds = 'Type in what the food cost, then draw. About 4 draws in 5 land between 10% and 20% of it; the rest are long shots, and the big ones over 20% are rare. It can still come up low. That is the game, not your performance.';
    if (extras.length) odds += ` Also in the hat: ${extras.join(', ')}.`;
    if (s.bonus) odds += ' Keep any amount you like or draw again; the last draw is final, even if it is smaller.';
    $('#odds-text').textContent = odds;
  }

  /* ---------------- hand layering ---------------- */
  function handLayer(where) {
    const g = stageRig.group;
    const cur = g.parentNode;
    const target = where === 'stage' ? layerHand : where === 'inside' ? slotInside : slotFront;
    if (cur === target) return;
    const p = stageRig.pose;
    if (cur === layerHand) stageRig.setPose({ x: p.x - HAT.x, y: p.y - HAT.y });
    else if (target === layerHand) stageRig.setPose({ x: p.x + HAT.x, y: p.y + HAT.y });
    target.appendChild(g);
  }
  /** Translation so that hand-local point `local` lands on `target` with rotation `rot` (degrees). */
  function handAt(local, target, rot) {
    const r = rot * Math.PI / 180;
    const x = local[0] * Math.cos(r) - local[1] * Math.sin(r);
    const y = local[0] * Math.sin(r) + local[1] * Math.cos(r);
    return { x: target[0] - x, y: target[1] - y, rot };
  }
  const PEN_TIP = Hand.PEN_TIP;

  /* ---------------- phases ---------------- */
  function slipLabel(slip) {
    if (slip.kind === 'money') return formatMoney(slip.value);
    if (slip.kind === 'wild') return 'WILD';
    if (slip.kind === 'redraw') return '+' + slip.n;
    return 'AGAIN';
  }

  function makeDeskSlip(label) {
    const g = svg('g', { transform: 'translate(100,275) rotate(-6)' });
    g.appendChild(svg('rect', { x: -44, y: -28, width: 88, height: 56, rx: 4, fill: '#fffbe6', stroke: '#cdbb7a', 'stroke-width': 2 }));
    g.appendChild(svg('line', { x1: -44, y1: 0, x2: 44, y2: 0, stroke: '#e5d9a8', 'stroke-width': 1, 'stroke-dasharray': '4 3' }));
    const clipId = 'clip' + Math.random().toString(36).slice(2, 8);
    const defs = svg('defs');
    const cp = svg('clipPath', { id: clipId });
    const cr = svg('rect', { x: -44, y: -28, width: 0, height: 56 });
    cp.appendChild(cr); defs.appendChild(cp); g.appendChild(defs);
    const fontSize = label.length > 5 ? 20 : label.length > 3 ? 26 : 30;
    const text = svg('text', { x: 0, y: 10, 'text-anchor': 'middle', 'font-size': fontSize, 'font-weight': 500, fill: '#1A140F', 'font-family': '"DM Mono", ui-monospace, Menlo, monospace', 'clip-path': `url(#${clipId})` }, [label]);
    g.appendChild(text);
    layerDesk.appendChild(g);
    return { g, reveal: (t) => cr.setAttribute('width', (88 * t).toFixed(1)) };
  }

  async function flySlipToHat(g, dur, run) {
    layerFlying.appendChild(g);
    const sx = 100, sy = 275, ex = HAT.x + rand(-40, 40), ey = HAT.y - 8;
    const cx = (sx + ex) / 2 + rand(-30, 30), cy = Math.min(sy, ey) - 150;
    const r0 = -6, r1 = rand(120, 400);
    await tween(dur, (t, raw) => {
      const x = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * ex;
      const y = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ey;
      const sc = 1 - 0.68 * t;
      const fold = raw < 0.25 ? 1 - 0.45 * (raw / 0.25) : 0.55;
      g.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${(r0 + (r1 - r0) * t).toFixed(1)}) scale(${sc.toFixed(3)},${(sc * fold).toFixed(3)})`);
    }, ease.linear);
    check(run);
    g.remove();
    stageHat.addSlip();
    Sfx.drop();
  }

  async function phaseWriting(run) {
    const pool = game.display; // what gets written and tossed in; the result itself was chosen before the round started
    const N = pool.length;
    handLayer('stage');
    stageRig.hold('pen');
    stageRig.setPose({ x: 330, y: -420, rot: 0, scale: 1, curl: Hand.POSES.pinch.curl.slice(), thumb: Hand.POSES.pinch.thumb });
    setBanner('Writing the slips', `0 of ${N} slips`, '✍️');

    // pick a lively sample to show being written
    const money = pool.map((s, i) => ({ s, i })).filter((o) => o.s.kind === 'money').sort((a, b) => a.s.value - b.s.value);
    const sample = [];
    if (money.length) { sample.push(money[money.length - 1].i); sample.push(money[0].i); }
    for (const kind of ['wild', 'again', 'redraw']) { const idx = pool.findIndex((s) => s.kind === kind); if (idx >= 0) sample.push(idx); }
    while (sample.length < Math.min(6, N)) { const i = randInt(0, N - 1); if (!sample.includes(i)) sample.push(i); }
    const show = shuffle(sample).slice(0, Math.min(6, N));
    const writePose = handAt(PEN_TIP, [100, 275], 25);

    let written = 0;
    for (let k = 0; k < show.length; k++) {
      check(run);
      const slip = makeDeskSlip(slipLabel(pool[show[k]]));
      await stageRig.moveTo(Object.assign({ curl: Hand.POSES.pinch.curl.slice(), thumb: Hand.POSES.pinch.thumb }, writePose), k === 0 ? 650 : 260, ease.out);
      check(run);
      Sfx.scribble();
      await tween(340, (t, raw) => {
        stageRig.setPose({ x: writePose.x + Math.sin(raw * Math.PI * 7) * 5, y: writePose.y + Math.sin(raw * Math.PI * 13) * 2.5 });
        slip.reveal(raw);
      }, ease.linear);
      check(run);
      written = Math.min(N, Math.round(((k + 1) / show.length) * N * 0.72));
      setBanner('Writing the slips', `${written} of ${N} slips`, '✍️');
      Sfx.toss();
      stageRig.moveTo({ x: writePose.x + 34, y: writePose.y - 42, rot: 18 }, 220, ease.out);
      flySlipToHat(slip.g, 520, run).catch(() => {});
      await wait(120);
    }
    check(run);
    // ...and the rest, in a flurry
    setBanner('And the rest', `${written} of ${N} slips`, '🌪️');
    stageRig.hold('none');
    await stageRig.moveTo({ x: 60, y: 80, rot: -20 }, 260, ease.inOut);
    Sfx.flurry();
    const flurry = [];
    const count = Math.min(12, Math.max(4, N - show.length));
    stageRig.moveTo({ x: 150, y: 190, rot: 12, curl: Hand.POSES.spread.curl.slice(), thumb: Hand.POSES.spread.thumb }, count * 45 + 200, ease.inOut);
    for (let i = 0; i < count; i++) {
      const g = makeDeskSlip('').g;
      g.setAttribute('transform', `translate(${100 + rand(-30, 30)},${275 + rand(-20, 20)}) rotate(${rand(-30, 30)}) scale(0.8)`);
      flurry.push(flySlipToHat(g, 420 + i * 25, run).catch(() => {}));
      setBanner('And the rest', `${Math.min(N, written + Math.round(((i + 1) / count) * (N - written)))} of ${N} slips`, '🌪️');
      await wait(45);
    }
    await Promise.all(flurry);
    check(run);
    setBanner('All in', `${N} slips in the hat`, '🎩');
    await wait(300);
  }

  async function phaseShake(run, short) {
    check(run);
    setBanner('Shake it up', 'mixing the slips', '🫨');
    handLayer('stage');
    stageRig.hold('none');
    const grip = handAt([0, 112], [HAT.x + 100, HAT.y + 40], 30);
    await stageRig.moveTo(Object.assign({ curl: Hand.POSES.open.curl.slice(), thumb: Hand.POSES.open.thumb }, { x: grip.x + 30, y: grip.y - 70, rot: 30 }), 520, ease.inOut);
    check(run);
    await stageRig.moveTo(Object.assign({ curl: Hand.POSES.grab.curl.slice(), thumb: Hand.POSES.grab.thumb }, grip), 260, ease.out);
    check(run);
    handLayer('front');
    const dur = short ? rand(1200, 2200) : rand(2200, 5200);
    const freq = rand(5.5, 7.5);
    let lastHalf = -1;
    await tween(dur, (t, raw) => {
      const secs = raw * dur / 1000;
      const env = Math.min(1, raw / 0.12, (1 - raw) / 0.15);
      const a = Math.sin(secs * freq * Math.PI * 2) * 9 * env;
      const dx = Math.sin(secs * freq * Math.PI * 2 + 1.2) * 7 * env;
      const dy = Math.abs(Math.sin(secs * freq * Math.PI * 4)) * -5 * env;
      hatGroup.setAttribute('transform', `translate(${HAT.x + dx},${HAT.y + dy}) rotate(${a.toFixed(2)})`);
      const half = Math.floor(secs * freq * 2);
      if (half !== lastHalf) { lastHalf = half; if (env > 0.3) { Sfx.rattle(); stageHat.jiggle(env); } }
    }, ease.linear);
    check(run);
    hatGroup.setAttribute('transform', `translate(${HAT.x},${HAT.y})`);
    stageHat.settle();
    handLayer('stage');
    await stageRig.moveTo({ x: grip.x + 40, y: grip.y - 90, rot: 30, curl: Hand.POSES.open.curl.slice(), thumb: Hand.POSES.open.thumb }, 320, ease.out);
    check(run);
  }

  async function phaseReach(run) {
    check(run);
    setBanner('Reaching in', 'no peeking', '🤞');
    handLayer('stage');
    await stageRig.moveTo({ x: HAT.x, y: HAT.y - 300, rot: 0, curl: Hand.POSES.spread.curl.slice(), thumb: Hand.POSES.spread.thumb }, 600, ease.inOut);
    check(run);
    handLayer('inside');
    Sfx.startShepard(); Sfx.shepardIntensity(0);
    await stageRig.moveTo({ x: 0, y: -72, rot: 0, curl: Hand.POSES.open.curl.slice(), thumb: Hand.POSES.open.thumb }, 650, ease.inOut);
    check(run);
    Sfx.startRummage();
    const dur = rand(900, 1700);
    await tween(dur, (t, raw) => {
      const s = raw * dur / 1000;
      stageRig.setPose({ x: Math.sin(s * 14) * 11, y: -72 + Math.sin(s * 11) * 7, rot: Math.sin(s * 9) * 7 });
      if (raw > 0.4) stageHat.jiggle(0.4);
    }, ease.linear);
    Sfx.stopRummage();
    check(run);
    stageHat.settle();
    stageRig.hold('slip', { label: '' });
    await stageRig.moveTo({ x: 0, y: -60, rot: 0, curl: Hand.POSES.pinch.curl.slice(), thumb: Hand.POSES.pinch.thumb }, 220, ease.out);
    check(run);
    setBanner('Got one', '', '📄');
    await stageRig.moveTo({ x: 0, y: -345, rot: 0 }, 850, ease.outBack);
    check(run);
    handLayer('stage');
  }

  async function phaseSuspense(run) {
    check(run);
    setBanner('And the tip is…', S.isParty() ? '⏳' : '');
    layerClock.setAttribute('opacity', '1');
    vignette.classList.add('tense');
    screens.stage.classList.add('tense');
    const dur = rand(3000, 8000);
    let n = 0;
    const tickOnce = () => {
      n++;
      Sfx.tick(n % 2 === 0);
      clockAngle += 30;
      clockHand.setAttribute('transform', `rotate(${clockAngle})`);
      clockG.classList.remove('tick'); void clockG.getBoundingClientRect(); clockG.classList.add('tick');
    };
    tickOnce();
    tickTimer = setInterval(tickOnce, ms(1000));
    const base = { x: stageRig.pose.x, y: stageRig.pose.y };
    await tween(dur, (t, raw) => {
      Sfx.shepardIntensity(raw);
      const j = 1 + raw * 3;
      stageRig.setPose({ x: base.x + (Math.random() - 0.5) * j, y: base.y + (Math.random() - 0.5) * j, rot: (Math.random() - 0.5) * raw * 2 });
    }, ease.linear);
    clearInterval(tickTimer); tickTimer = null;
    check(run);
  }

  /** One slip out of the hat. The special slips (wild, blank, bonus) each take one slot beside the money slips and
      leave the hat once drawn. A money slip's amount comes from the weighted draw against the order total. */
  function drawSlip() {
    const amounts = S.get().amounts;
    const specials = game.specials;
    const slots = amounts.length + specials.length;
    const u = TipMath.random();
    if (specials.length && u * slots < specials.length) return specials.splice(Math.floor(u * slots), 1)[0];
    return { kind: 'money', value: TipMath.select(game.orderCents, { amounts }) };
  }

  async function phaseReveal(run, slip) {
    check(run);
    Sfx.stopShepard();
    layerClock.setAttribute('opacity', '0');
    vignette.classList.remove('tense');
    screens.stage.classList.remove('tense');
    const label = slip.kind === 'money' ? formatMoney(slip.value) : slip.kind === 'wild' ? 'WILD!' : slip.kind === 'redraw' ? '+' + slip.n : 'AGAIN!';
    stageRig.hold('slip', { label });
    const held = stageRig.held.firstChild;
    if (slip.kind === 'again') Sfx.boing(); else if (slip.kind === 'wild' || slip.kind === 'redraw') Sfx.sparkle(); else if (game.bonusLeft > 0) Sfx.pop(); else Sfx.fanfare();
    await tween(380, (t) => { held.setAttribute('transform', `translate(${Hand.SLIP.x},${Hand.SLIP.y}) rotate(${Hand.SLIP.rot}) scale(${(1 + 0.8 * t).toFixed(3)})`); }, ease.outBack);
    check(run);
    setBanner(slip.kind === 'money' ? formatMoney(slip.value) : slip.kind === 'wild' ? 'Wild card' : slip.kind === 'redraw' ? 'Bonus!' : 'Choose again', '');
    await wait(420);
    check(run);
    showResult(slip);
  }

  /* ---------------- result overlay ---------------- */
  /* ---------- win sign-off ----------
     The layered "thank you" squeezes and stretches for a moment, rests while firecrackers shoot up from
     behind the card, then goes again. A few loops, then it stays put. */
  const thanks = { timers: [] };
  function stopThanks() {
    thanks.timers.forEach(clearTimeout); thanks.timers = [];
    const stack = $('#thanks-stack');
    stack.classList.remove('accordion'); stack.hidden = true;
    Crackers.stop();
  }
  function startThanks(loops) {
    stopThanks();
    const stack = $('#thanks-stack');
    stack.hidden = false;
    const later = (fn, t) => thanks.timers.push(setTimeout(fn, t));
    const cycle = (n) => {
      stack.classList.remove('accordion'); void stack.offsetWidth; stack.classList.add('accordion');
      later(() => {
        stack.classList.remove('accordion');
        Crackers.fire(crackers, resultCard.getBoundingClientRect(), S.get().skin);
        later(() => { if (n + 1 < loops) cycle(n + 1); }, 2600);
      }, 2100); // three squeezes at .7 s
    };
    later(() => cycle(0), 350);
  }

  function showResult(slip) {
    stopThanks();
    const bgSetting = S.get().background;
    const bg = bgSetting === 'random' ? pick(S.BACKGROUNDS) : bgSetting;
    const party = S.isParty(), end = party ? '!' : '.';
    result.hidden = false;
    result.className = 'result';
    const card = $('#result-card'), againBlock = $('#result-again'), replay = $('#btn-replay'), amount = $('#result-amount');
    const keep = $('#btn-keep'), draw = $('#btn-draw'), kicker = $('#result-kicker'), sub = $('#result-sub');
    card.hidden = false; againBlock.hidden = true; keep.hidden = true; draw.hidden = true; replay.hidden = false;
    $('#flash').classList.remove('go'); // the white flash belongs to the win reveal only (showing the overlay restarts its animation)
    replay.className = 'ee-btn ee-btn--primary ee-btn--block ee-btn--lg';
    draw.className = 'ee-btn ee-btn--primary ee-btn--block ee-btn--lg';
    const left = game ? game.bonusLeft : 0;

    if (slip.kind === 'again') {
      // the ember banner is the one call to action here, so "play again" steps down to outline
      card.hidden = true; againBlock.hidden = false;
      replay.className = 'ee-btn ee-btn--outline ee-btn--block ee-btn--lg';
      $('#btn-again').textContent = 'Draw again';
      $('#again-sub').textContent = `Not that one. Back into the hat${end}`;
      result.classList.add('again');
      return;
    }
    if (slip.kind === 'redraw') {
      kicker.textContent = 'Bonus slip!';
      amount.textContent = '+' + slip.n;
      amount.className = 'result-amount is-number';
      sub.textContent = `${plural(slip.n, 'extra draw')}${left > slip.n ? `, ${left} in total` : ''}. Keep any amount you like or draw again. The last draw is final${end}`;
      $('#btn-draw-text').textContent = 'Draw';
      draw.hidden = false;
      replay.className = 'ee-btn ee-btn--outline ee-btn--block ee-btn--lg';
      result.classList.add('bonus');
      return;
    }
    if (slip.kind === 'money' && left > 0) {
      kicker.textContent = 'You drew';
      amount.textContent = formatMoney(slip.value);
      amount.className = 'result-amount is-number';
      sub.textContent = `${pctOfOrder(slip.value)}% of the order. Keep it, or draw again? ${plural(left, 'draw')} left. The last draw is final${end}`;
      $('#btn-keep-text').textContent = `Keep ${formatMoney(slip.value)}`;
      $('#btn-draw-text').textContent = `Draw again (${left} left)`;
      keep.hidden = false; draw.hidden = false; replay.hidden = true;
      draw.className = 'ee-btn ee-btn--outline ee-btn--block ee-btn--lg';
      result.classList.add('decide');
      return;
    }
    if (slip.kind === 'money') {
      kicker.textContent = 'We got a winner!';
      amount.textContent = formatMoney(slip.value);
      amount.className = 'result-amount is-number';
      const pct = pctOfOrder(slip.value);
      sub.textContent = `That's the tip${pct === null ? '' : `: ${pct}% of the order`}. Thank you, Dasher${party ? '! 🙌' : '.'}`;
    } else {
      kicker.textContent = 'Wild card';
      amount.textContent = party ? '🃏' : 'Wild';
      amount.className = 'result-amount is-word';
      sub.textContent = `Dasher's choice. Name your tip${end}`;
    }
    result.classList.add('win', 'bg-' + bg);
    Celebrate.start(canvas, bg, S.get().skin);
    startThanks(3);
    if (bg === 'crowd') Sfx.crowdRoar(5);
    void $('#flash').offsetWidth; $('#flash').classList.add('go');
    card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
  }
  function hideResult() {
    stopThanks();
    Celebrate.stop();
    result.hidden = true;
    result.className = 'result';
  }

  /* ---------------- rounds ---------------- */
  function resetStage() {
    Sfx.stopShepard(); Sfx.stopRummage();
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    layerClock.setAttribute('opacity', '0');
    vignette.classList.remove('tense');
    screens.stage.classList.remove('tense');
    while (layerDesk.firstChild) layerDesk.removeChild(layerDesk.firstChild);
    while (layerFlying.firstChild) layerFlying.removeChild(layerFlying.firstChild);
    hatGroup.setAttribute('transform', `translate(${HAT.x},${HAT.y})`);
    if (stageDirty) buildStage();
    handLayer('stage');
    stageRig.hold('none');
    stageRig.setPose({ x: 330, y: -420, rot: 0, scale: 1, curl: Hand.POSES.open.curl.slice(), thumb: Hand.POSES.open.thumb });
  }

  /** A new delivery: `orderCents` is what the food cost. The special slips go in the hat beside the money slips. */
  function newGame(orderCents) {
    const pool = S.buildPool();
    game = {
      orderCents: Number.isInteger(orderCents) && orderCents > 0 ? orderCents : 5000, // test hooks may skip the receipt
      specials: shuffle(pool.filter((s) => s.kind !== 'money')),
      display: shuffle(pool),
      bonusLeft: 0, lastSlip: null, total: pool.length,
    };
  }

  async function runRound(opts) {
    const run = ++runId;
    // The result is chosen here, once, before anything moves. The animation only shows it.
    const slip = drawSlip();
    game.lastSlip = slip;
    if (slip.kind === 'redraw') game.bonusLeft += slip.n;
    try {
      showScreen('stage');
      resetStage();
      if (opts.fresh) stageHat.clearSlips();
      await wait(150);
      if (opts.fresh) await phaseWriting(run);
      await phaseShake(run, !opts.fresh);
      await phaseReach(run);
      await phaseSuspense(run);
      await phaseReveal(run, slip);
    } catch (e) {
      if (!(e instanceof Cancelled)) { console.error(e); abort(); }
    }
  }
  function abort() {
    runId++;
    closeOrder();
    hideResult();
    resetStage();
    showScreen('home');
  }

  /* ---------------- the order (receipt) ---------------- */
  const order = $('#order'), orderInput = $('#order-input'), orderError = $('#order-error');
  const RECEIPT_ITEMS = [['Spicy chicken sandwich', 2], ['Loaded fries', 1], ['Large lemonade', 2], ['Chocolate chip cookie', 1], ['Caesar salad', 1],
    ['Pepperoni pizza', 1], ['Boba milk tea', 2], ['Garlic knots', 1], ['Pad thai', 1], ['Birria tacos', 3], ['Iced latte', 1], ['Double cheeseburger', 2], ['Onion rings', 1]];
  function receiptEdge() {
    // a sawtooth along the bottom of the paper
    const teeth = 22, pts = ['0 0', '100% 0', '100% calc(100% - 8px)'];
    for (let k = teeth; k > 0; k--) pts.push(`${((k - 0.5) / teeth * 100).toFixed(3)}% 100%`, `${((k - 1) / teeth * 100).toFixed(3)}% calc(100% - 8px)`);
    $('#order-form').style.clipPath = `polygon(${pts.join(', ')})`;
  }
  function openOrder() {
    // the stage waits behind the receipt, blurred
    runId++;
    showScreen('stage'); resetStage(); stageHat.clearSlips();
    $('#receipt-no').textContent = `Order #${randInt(1000, 9999)}`;
    const items = shuffle(RECEIPT_ITEMS.slice()).slice(0, 4);
    $('#receipt-items').innerHTML = items.map(([name, qty]) => `<div class="receipt-row"><span>${qty} ${name}</span><span>${(rand(3, 19) * qty).toFixed(2)}</span></div>`).join('');
    orderInput.value = ''; orderError.textContent = '';
    order.hidden = false; order.classList.add('open');
    setTimeout(() => orderInput.focus(), 60);
  }
  function closeOrder() { order.hidden = true; order.classList.remove('open'); }
  function submitOrder() {
    const parsed = TipMath.parseOrderTotal(orderInput.value);
    if (parsed.error) { orderError.textContent = parsed.error; orderInput.focus(); Sfx.boing(); return false; }
    Sfx.pop();
    closeOrder();
    startRound(parsed.cents);
    return true;
  }
  function startRound(orderCents) { newGame(orderCents); runRound({ fresh: true }); }
  function pctOfOrder(value) { return game && game.orderCents ? Math.round(value * 10000 / game.orderCents) : null; }

  /* ---------------- settings drawer ---------------- */
  const drawer = $('#drawer'), backdrop = $('#drawer-backdrop');
  function openDrawer() {
    drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false');
    backdrop.hidden = false; $('#btn-menu').setAttribute('aria-expanded', 'true');
    document.body.classList.add('drawer-open');
  }
  function closeDrawer() {
    drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true');
    backdrop.hidden = true; $('#btn-menu').setAttribute('aria-expanded', 'false');
    document.body.classList.remove('drawer-open');
  }
  function renderSettings() {
    const s = S.get();
    $$('.seg-btn').forEach((b) => b.setAttribute('aria-pressed', b.dataset.themeChoice === S.effectiveTheme() ? 'true' : 'false'));
    $('#look-section').hidden = !s.eggFound;
    $$('.skin-btn').forEach((b) => b.setAttribute('aria-pressed', b.dataset.skinChoice === s.skin ? 'true' : 'false'));
    $('#set-skin-toggle').checked = s.setSkin;
    $('#skin-swatches').hidden = !s.setSkin;
    $('#skin-help').textContent = s.setSkin ? 'Pick the skin tone of the hand.' : 'Off: a new random hand every session.';
    const sw = $('#skin-swatches');
    sw.innerHTML = '';
    for (const t of S.SKIN_TONES) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'swatch' + (t.id === s.skinTone ? ' active' : ''); b.style.background = t.hex; b.title = t.id; b.setAttribute('aria-label', t.id);
      b.addEventListener('click', () => { S.set({ skinTone: t.id }); look = Hand.makeLook(t.hex, S.get().hand, look); rebuildHands(); renderSettings(); Sfx.tap(); });
      sw.appendChild(b);
    }
    const hatSel = $('#set-hat');
    if (!hatSel.options.length) for (const h of S.HAT_COLORS) { const o = document.createElement('option'); o.value = h.id; o.textContent = h.name; hatSel.appendChild(o); }
    hatSel.value = s.hatColor;
    const chips = $('#amount-chips');
    chips.innerHTML = '';
    for (const v of s.amounts) {
      const c = document.createElement('button');
      c.type = 'button'; c.className = 'ee-badge chip'; c.setAttribute('aria-label', `Remove ${formatMoney(v)}`);
      c.innerHTML = `${formatMoney(v)}<svg class="icon" aria-hidden="true"><use href="#i-close"/></svg>`;
      c.addEventListener('click', () => { S.setAmounts(s.amounts.filter((x) => x !== v)); renderSettings(); updateHomeText(); Sfx.tap(); checkEgg(); });
      chips.appendChild(c);
    }
    renderHandPrefs();
    $('#set-again').value = s.chooseAgain;
    $('#set-wild').value = s.wild;
    $('#set-bonus').value = s.bonus;
    $('#set-bg').value = s.background;
    $('#set-sound').checked = s.sound;
  }
  /** The accessory pickers: one select per part, each with a Random option. */
  function renderHandPrefs() {
    const grid = $('#hand-prefs');
    const prefs = Object.assign({}, Hand.DEFAULT_PREFS, S.get().hand);
    if (!grid.childElementCount) {
      for (const key of Object.keys(Hand.OPTIONS)) {
        const field = document.createElement('div');
        field.className = 'ee-field';
        const id = 'pref-' + key;
        field.innerHTML = `<label for="${id}">${Hand.LABELS[key]}</label><div class="select-wrap"><select id="${id}" class="ee-input" data-pref="${key}"></select><svg class="icon"><use href="#i-chevron"/></svg></div>`;
        const sel = field.querySelector('select');
        for (const [value, label] of Hand.OPTIONS[key]) { const o = document.createElement('option'); o.value = value; o.textContent = label; sel.appendChild(o); }
        sel.addEventListener('change', () => {
          S.setHandPref(key, sel.value);
          look = Hand.makeLook(S.get().setSkin ? S.skinHex() : look.skin, S.get().hand, look);
          rebuildHands(); Sfx.tap();
        });
        grid.appendChild(field);
      }
    }
    for (const sel of grid.querySelectorAll('select')) sel.value = prefs[sel.dataset.pref] || 'random';
  }
  function wireSettings() {
    $('#btn-menu').addEventListener('click', () => { Sfx.unlock(); renderSettings(); openDrawer(); });
    $('#btn-close-drawer').addEventListener('click', closeDrawer);
    backdrop.addEventListener('click', closeDrawer);
    $$('.seg-btn').forEach((b) => b.addEventListener('click', () => { S.set({ theme: b.dataset.themeChoice }); S.applyTheme(); renderSettings(); Sfx.tap(); }));
    $$('.skin-btn').forEach((b) => b.addEventListener('click', () => { S.set({ skin: b.dataset.skinChoice }); S.applyTheme(); renderSettings(); Sfx.tap(); }));
    $('#set-skin-toggle').addEventListener('change', (e) => {
      S.set({ setSkin: e.target.checked });
      look = Hand.makeLook(e.target.checked ? S.skinHex() : pick(S.SKIN_TONES).hex, S.get().hand, look);
      rebuildHands(); renderSettings();
    });
    $('#btn-reroll-hand').addEventListener('click', () => {
      look = Hand.makeLook(S.get().setSkin ? S.skinHex() : null, S.get().hand, null);
      rebuildHands(); Sfx.pop();
      const m = $('.hand-mini'); m.classList.remove('spin'); void m.offsetWidth; m.classList.add('spin');
    });
    $('#set-hat').addEventListener('change', (e) => { S.set({ hatColor: e.target.value }); rebuildHats(); renderSettings(); Sfx.tap(); });
    const addAmount = () => {
      const inp = $('#amount-input'), field = $('#amount-field'), err = $('#amount-error');
      const v = parseFloat(inp.value);
      if (!Number.isFinite(v) || v < 0) { field.classList.add('ee-field--error'); err.hidden = false; return; }
      field.classList.remove('ee-field--error'); err.hidden = true;
      S.setAmounts(S.get().amounts.concat([v]));
      inp.value = '';
      renderSettings(); updateHomeText(); Sfx.pop();
      checkEgg();
    };
    $('#btn-add-amount').addEventListener('click', addAmount);
    $('#amount-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addAmount(); } });
    $('#set-again').addEventListener('change', (e) => { S.set({ chooseAgain: clamp(parseInt(e.target.value, 10) || 0, 0, 50) }); renderSettings(); updateHomeText(); });
    $('#set-wild').addEventListener('change', (e) => { S.set({ wild: clamp(parseInt(e.target.value, 10) || 0, 0, 50) }); renderSettings(); updateHomeText(); });
    $('#set-bonus').addEventListener('change', (e) => { S.set({ bonus: clamp(parseInt(e.target.value, 10) || 0, 0, 5) }); renderSettings(); updateHomeText(); });
    $('#btn-reset-amounts').addEventListener('click', () => { S.resetAmounts(); renderSettings(); updateHomeText(); Sfx.pop(); });
    $('#set-bg').addEventListener('change', (e) => { S.set({ background: e.target.value }); Sfx.tap(); });
    $('#set-sound').addEventListener('change', (e) => { S.set({ sound: e.target.checked }); Sfx.setEnabled(e.target.checked); if (e.target.checked) { Sfx.unlock(); Sfx.pop(); } });
  }

  /* ---------------- the Easter egg ---------------- */
  // Set the tip amounts to just 7 and 11: balloons, a cheer, and the app's first look appears.
  let eggRunning = false;
  function checkEgg() {
    const a = S.get().amounts;
    if (a.length === 2 && a[0] === 7 && a[1] === 11 && !eggRunning) runEgg();
  }
  function runEgg() {
    eggRunning = true;
    closeDrawer();
    const box = $('#balloons');
    box.innerHTML = '';
    box.hidden = false;
    const colors = ['#ff2d95', '#ffe600', '#00e5ff', '#7cff3e', '#ff7a00', '#b14cff', '#ff3b30', '#1de9b6', '#ff6ec7', '#2d7dff'];
    let longest = 0;
    for (let i = 0; i < 34; i++) {
      const b = document.createElement('div');
      b.className = 'balloon';
      const dur = rand(3.8, 6.0) * U.SPEED, delay = rand(0, 2.2) * U.SPEED;
      b.style.setProperty('--w', rand(38, 70).toFixed(0) + 'px');
      b.style.setProperty('--c', pick(colors));
      b.style.setProperty('--d', dur.toFixed(2) + 's');
      b.style.setProperty('--delay', delay.toFixed(2) + 's');
      b.style.left = rand(-4, 96).toFixed(1) + '%';
      box.appendChild(b);
      longest = Math.max(longest, dur + delay);
    }
    Sfx.unlock(); Sfx.kidsYay();
    // the new look is revealed while the screen is full of balloons
    setTimeout(() => {
      // the look switches, and the hat gets its amounts back: 7 and 11 were only the key
      S.set({ skin: 'party', eggFound: true });
      S.setAmounts(S.DEFAULT_AMOUNTS);
      S.applyTheme();
      renderSettings();
      updateHomeText();
      hideResult();
      runId++;
      resetStage();
      showScreen('home');
    }, U.ms(2300));
    setTimeout(() => { box.hidden = true; box.innerHTML = ''; eggRunning = false; }, longest * 1000 + 400);
  }

  /* ---------------- buttons ---------------- */
  let starting = false;
  function wireButtons() {
    $('#btn-draw-tip').addEventListener('click', () => {
      if (starting) return;
      starting = true;
      Sfx.unlock(); Sfx.twinkle();
      starBurst();
      setTimeout(() => { starting = false; openOrder(); }, ms(520));
    });
    $('#btn-abort').addEventListener('click', () => { Sfx.tap(); abort(); });
    $('#btn-home').addEventListener('click', () => { Sfx.tap(); abort(); });
    $('#btn-replay').addEventListener('click', () => { Sfx.pop(); abort(); });
    $('#order-form').addEventListener('submit', (e) => { e.preventDefault(); Sfx.unlock(); submitOrder(); });
    orderInput.addEventListener('input', () => { orderError.textContent = ''; });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !order.hidden) abort(); });
    receiptEdge();
    $('#btn-again').addEventListener('click', (e) => { e.preventDefault(); Sfx.pop(); hideResult(); runRound({ fresh: false }); });
    // a bonus draw: one of the extra draws is spent, the hand goes back in
    $('#btn-draw').addEventListener('click', () => { Sfx.pop(); hideResult(); if (game.bonusLeft > 0) game.bonusLeft--; runRound({ fresh: false }); });
    // keep the amount on the table
    $('#btn-keep').addEventListener('click', () => { Sfx.pop(); game.bonusLeft = 0; showResult(game.lastSlip); });
  }

  /* ---------------- boot ---------------- */
  function boot() {
    Sfx.setEnabled(S.get().sound);
    buildPreview(); buildMini(); buildStage(); buildStars();
    renderSettings(); updateHomeText();
    wireSettings(); wireButtons();
    showScreen('home');
    if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
    // expose a little for testing
    window.TipHat = { get game() { return game; }, get look() { return look; }, runRound, newGame, startRound, drawSlip, openOrder, submitOrder, showResult, hideResult, abort, runEgg };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
