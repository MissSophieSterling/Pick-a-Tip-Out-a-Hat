/* Game flow, screens, and the settings drawer. */
(function () {
  'use strict';
  const { $, $$, rand, randInt, pick, wait, tween, ease, svg, ms, formatMoney, shuffle, clamp } = U;
  const S = Settings;

  /* ---------------- DOM ---------------- */
  const screens = { home: $('#screen-home'), pick: $('#screen-pick'), stage: $('#screen-stage') };
  const layerHand = $('#layer-hand'), layerFlying = $('#layer-flying'), layerDesk = $('#layer-desk'), layerClock = $('#layer-clock');
  const hatGroup = $('#hat-group'), slotInside = $('#hand-slot-inside'), slotFront = $('#hand-slot-front');
  const bannerText = $('#banner-text'), bannerSub = $('#banner-sub');
  const vignette = $('#vignette');
  const result = $('#result'), resultCard = $('#result-card'), canvas = $('#celebration');
  const HAT = { x: 185, y: 445 };

  /* ---------------- state ---------------- */
  let look = Hand.randomLook(S.get().setSkin ? S.skinHex() : null);
  let stageRig = null, previewRig = null, miniRig = null, stageHat = null, previewHat = null;
  let runId = 0;              // bump to cancel an in-flight round
  let game = null;            // { mode, pool, assignment, used:Set, picked }
  let idleRaf = 0;
  let shepardOn = false, tickTimer = null;
  let stageDirty = false;
  let currentScreen = 'home';
  let clockHand = null, clockG = null, clockAngle = 0;

  class Cancelled extends Error {}
  const check = (run) => { if (run !== runId) throw new Cancelled('cancelled'); };

  /* ---------------- building ---------------- */
  function buildPreview() {
    previewHat = Hat.create(svg('g'), svg('g'), S.hatHex());
    const ph = $('#preview-hat');
    while (ph.firstChild) ph.removeChild(ph.firstChild);
    const back = svg('g'), front = svg('g');
    previewHat = Hat.create(back, front, S.hatHex());
    const wrap = svg('g', { transform: 'translate(200,290) scale(0.95)' });
    wrap.appendChild(back); wrap.appendChild(front);
    ph.appendChild(wrap);
    for (let i = 0; i < 9; i++) previewHat.addSlip();
    const hg = $('#preview-hand');
    previewRig = Hand.create(hg, look);
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
      clockG.appendChild(svg('circle', { cx: x, cy: y, r: 10, fill: '#ffd60a', stroke: '#8a6d1a', 'stroke-width': 2 }));
    });
    clockG.appendChild(svg('circle', { cx: 0, cy: 0, r: 42, fill: '#ff3b30', stroke: '#8a1c1c', 'stroke-width': 3 }));
    clockG.appendChild(svg('circle', { cx: 0, cy: 0, r: 34, fill: '#fff', stroke: '#222', 'stroke-width': 2 }));
    for (let k = 0; k < 12; k++) clockG.appendChild(svg('line', { x1: 0, y1: -30, x2: 0, y2: k % 3 === 0 ? -23 : -26, stroke: '#222', 'stroke-width': k % 3 === 0 ? 3 : 1.6, transform: `rotate(${k * 30})` }));
    clockG.appendChild(svg('line', { x1: 0, y1: 4, x2: 0, y2: -16, stroke: '#222', 'stroke-width': 4, 'stroke-linecap': 'round', transform: 'rotate(300)' }));
    clockG.appendChild(svg('line', { x1: 0, y1: 4, x2: 0, y2: -24, stroke: '#222', 'stroke-width': 3, 'stroke-linecap': 'round', transform: 'rotate(60)' }));
    clockHand = svg('line', { x1: 0, y1: 8, x2: 0, y2: -29, stroke: '#e0222e', 'stroke-width': 2, 'stroke-linecap': 'round' });
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

  function setBanner(text, sub) {
    bannerText.textContent = text;
    bannerSub.textContent = sub || '';
    bannerText.classList.remove('bump'); void bannerText.offsetWidth; bannerText.classList.add('bump');
  }
  function updateSummary() {
    const s = S.get();
    $('#slip-summary').textContent = `${s.amounts.length} amounts · ${s.wild} wild card${s.wild === 1 ? '' : 's'} · ${s.chooseAgain} choose-again · ${S.slipCount()} slips in the hat`;
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
  function slipLabel(slip, mode, number) {
    if (mode === 'number') return '#' + number;
    if (slip.kind === 'money') return formatMoney(slip.value);
    if (slip.kind === 'wild') return 'WILD';
    return 'AGAIN';
  }

  function makeDeskSlip(label, folded) {
    const g = svg('g', { transform: 'translate(100,275) rotate(-6)' });
    g.appendChild(svg('rect', { x: -44, y: -28, width: 88, height: 56, rx: 4, fill: '#fffbe6', stroke: '#cdbb7a', 'stroke-width': 2 }));
    g.appendChild(svg('line', { x1: -44, y1: 0, x2: 44, y2: 0, stroke: '#e5d9a8', 'stroke-width': 1, 'stroke-dasharray': '4 3' }));
    const clipId = 'clip' + Math.random().toString(36).slice(2, 8);
    const defs = svg('defs');
    const cp = svg('clipPath', { id: clipId });
    const cr = svg('rect', { x: -44, y: -28, width: 0, height: 56 });
    cp.appendChild(cr); defs.appendChild(cp); g.appendChild(defs);
    const fontSize = label.length > 5 ? 20 : label.length > 3 ? 26 : 30;
    const text = svg('text', { x: 0, y: 10, 'text-anchor': 'middle', 'font-size': fontSize, 'font-weight': 700, fill: '#1b2a49', 'font-family': 'Fredoka, Arial, sans-serif', 'clip-path': `url(#${clipId})` }, [label]);
    g.appendChild(text);
    layerDesk.appendChild(g);
    return { g, reveal: (t) => cr.setAttribute('width', (88 * t).toFixed(1)), folded };
  }

  async function flySlipToHat(g, dur, run) {
    // move the element to the flying layer and arc it into the hat
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

  async function phaseWriting(run, mode) {
    const pool = game.pool;
    const N = pool.length;
    handLayer('stage');
    stageRig.hold('pen');
    stageRig.setPose({ x: 330, y: -420, rot: 0, scale: 1, curl: Hand.POSES.pinch.curl.slice(), thumb: Hand.POSES.pinch.thumb });
    setBanner('Writing up the tips ✍️', `0 of ${N} slips`);

    // pick a lively sample to show being written
    const money = pool.map((s, i) => ({ s, i })).filter((o) => o.s.kind === 'money');
    const sample = [];
    if (money.length) { sample.push(money[money.length - 1].i); sample.push(money[0].i); }
    const wildIdx = pool.findIndex((s) => s.kind === 'wild'); if (wildIdx >= 0) sample.push(wildIdx);
    const againIdx = pool.findIndex((s) => s.kind === 'again'); if (againIdx >= 0) sample.push(againIdx);
    while (sample.length < Math.min(6, N)) { const i = randInt(0, N - 1); if (!sample.includes(i)) sample.push(i); }
    const show = shuffle(sample).slice(0, Math.min(6, N));
    const writePose = handAt(PEN_TIP, [100, 275], 25);

    let written = 0;
    for (let k = 0; k < show.length; k++) {
      check(run);
      const idx = show[k];
      const label = slipLabel(pool[idx], mode, idx + 1);
      const slip = makeDeskSlip(label, mode === 'value');
      await stageRig.moveTo(Object.assign({ curl: Hand.POSES.pinch.curl.slice(), thumb: Hand.POSES.pinch.thumb }, writePose), k === 0 ? 650 : 260, ease.out);
      check(run);
      Sfx.scribble();
      await tween(340, (t, raw) => {
        stageRig.setPose({ x: writePose.x + Math.sin(raw * Math.PI * 7) * 5, y: writePose.y + Math.sin(raw * Math.PI * 13) * 2.5 });
        slip.reveal(raw);
      }, ease.linear);
      check(run);
      written = Math.min(N, Math.round(((k + 1) / show.length) * N * 0.72));
      setBanner('Writing up the tips ✍️', `${written} of ${N} slips`);
      // flick it into the hat while the hand lifts
      Sfx.toss();
      stageRig.moveTo({ x: writePose.x + 34, y: writePose.y - 42, rot: 18 }, 220, ease.out);
      flySlipToHat(slip.g, 520, run).catch(() => {});
      await wait(120);
    }
    check(run);
    // ...and the rest, in a flurry
    setBanner('And the rest! 🌪️', `${written} of ${N} slips`);
    stageRig.hold('none');
    await stageRig.moveTo({ x: 60, y: 80, rot: -20 }, 260, ease.inOut);
    Sfx.flurry();
    const flurry = [];
    const count = Math.min(12, Math.max(4, N - show.length));
    stageRig.moveTo({ x: 150, y: 190, rot: 12, curl: Hand.POSES.spread.curl.slice(), thumb: Hand.POSES.spread.thumb }, count * 45 + 200, ease.inOut);
    for (let i = 0; i < count; i++) {
      const g = makeDeskSlip('', true).g;
      g.setAttribute('transform', `translate(${100 + rand(-30, 30)},${275 + rand(-20, 20)}) rotate(${rand(-30, 30)}) scale(0.8)`);
      flurry.push(flySlipToHat(g, 420 + i * 25, run).catch(() => {}));
      setBanner('And the rest! 🌪️', `${Math.min(N, written + Math.round(((i + 1) / count) * (N - written)))} of ${N} slips`);
      await wait(45);
    }
    stageRig.hold('none');
    await Promise.all(flurry);
    check(run);
    setBanner('All in! 🎩', `${N} slips in the hat`);
    await wait(300);
  }

  async function phaseShake(run, short) {
    check(run);
    setBanner('Shake it up! 🫨', 'mixing the slips…');
    // grab the bill
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
    // let go
    handLayer('stage');
    await stageRig.moveTo({ x: grip.x + 40, y: grip.y - 90, rot: 30, curl: Hand.POSES.open.curl.slice(), thumb: Hand.POSES.open.thumb }, 320, ease.out);
    check(run);
  }

  async function phaseReach(run, mode, number) {
    check(run);
    setBanner('Reaching in… 🤞', 'no peeking');
    handLayer('stage');
    await stageRig.moveTo({ x: HAT.x, y: HAT.y - 300, rot: 0, curl: Hand.POSES.spread.curl.slice(), thumb: Hand.POSES.spread.thumb }, 600, ease.inOut);
    check(run);
    handLayer('inside');
    Sfx.startShepard(); shepardOn = true; Sfx.shepardIntensity(0);
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
    const label = mode === 'number' ? '#' + number : '';
    stageRig.hold('slip', { label });
    await stageRig.moveTo({ x: 0, y: -60, rot: 0, curl: Hand.POSES.pinch.curl.slice(), thumb: Hand.POSES.pinch.thumb }, 220, ease.out);
    check(run);
    setBanner('Got one! 📄', '');
    await stageRig.moveTo({ x: 0, y: -345, rot: 0 }, 850, ease.outBack);
    check(run);
    handLayer('stage');
  }

  async function phaseSuspense(run) {
    check(run);
    setBanner('And the tip is…', '⏳');
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

  function drawSlip(mode, number) {
    if (mode === 'number') return game.assignment[number - 1];
    if (!game.pool.length) game.pool = shuffle(S.buildPool()); // only possible if every slip left said "again"
    const i = randInt(0, game.pool.length - 1);
    return game.pool.splice(i, 1)[0];
  }

  async function phaseReveal(run, slip, mode) {
    check(run);
    Sfx.stopShepard(); shepardOn = false;
    layerClock.setAttribute('opacity', '0');
    vignette.classList.remove('tense');
    screens.stage.classList.remove('tense');
    // the slip in the hand pops open with the result
    const label = slip.kind === 'money' ? formatMoney(slip.value) : slip.kind === 'wild' ? 'WILD!' : 'AGAIN!';
    stageRig.hold('slip', { label });
    const held = stageRig.held.firstChild;
    if (slip.kind === 'again') Sfx.boing(); else if (slip.kind === 'wild') Sfx.sparkle(); else Sfx.fanfare();
    await tween(380, (t) => { held.setAttribute('transform', `translate(${Hand.SLIP.x},${Hand.SLIP.y}) rotate(${Hand.SLIP.rot}) scale(${(1 + 0.8 * t).toFixed(3)})`); }, ease.outBack);
    check(run);
    setBanner(slip.kind === 'money' ? formatMoney(slip.value) + '!' : slip.kind === 'wild' ? 'WILD CARD!' : 'CHOOSE AGAIN!', '');
    await wait(420);
    check(run);
    showResult(slip, mode);
  }

  /* ---------------- result overlay ---------------- */
  function showResult(slip, mode) {
    const bgSetting = S.get().background;
    const bg = bgSetting === 'random' ? pick(S.BACKGROUNDS) : bgSetting;
    result.hidden = false;
    result.className = 'result';
    const again = $('#btn-again');
    again.hidden = true;
    if (slip.kind === 'money') {
      $('#result-kicker').textContent = 'WE GOT A WINNER!';
      $('#result-amount').textContent = formatMoney(slip.value);
      $('#result-sub').textContent = "That's the tip. Thank you, Dasher! 🙌";
      result.classList.add('win', 'bg-' + bg);
      Celebrate.start(canvas, bg);
      if (bg === 'crowd') Sfx.crowdRoar(5);
    } else if (slip.kind === 'wild') {
      $('#result-kicker').textContent = '🃏 WILD CARD! 🃏';
      $('#result-amount').textContent = 'WILD';
      $('#result-sub').textContent = "Dasher's choice. Name your tip!";
      result.classList.add('win', 'wild', 'bg-' + bg);
      Celebrate.start(canvas, bg);
      if (bg === 'crowd') Sfx.crowdRoar(5);
    } else {
      $('#result-kicker').textContent = 'OOOH, SO CLOSE!';
      $('#result-amount').textContent = 'CHOOSE AGAIN';
      $('#result-sub').textContent = mode === 'number' ? 'Not that one. Pick another number!' : 'Not that one. Back into the hat!';
      result.classList.add('again');
      again.hidden = false;
      $('#btn-again-text').textContent = mode === 'number' ? 'Pick another number' : 'Draw again';
    }
    $('#flash').classList.remove('go'); void $('#flash').offsetWidth; $('#flash').classList.add('go');
    resultCard.classList.remove('in'); void resultCard.offsetWidth; resultCard.classList.add('in');
  }
  function hideResult() {
    Celebrate.stop();
    result.hidden = true;
    result.className = 'result';
  }

  /* ---------------- rounds ---------------- */
  function resetStage() {
    Sfx.stopShepard(); Sfx.stopRummage(); shepardOn = false;
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

  function newGame(mode) {
    const pool = S.buildPool();
    game = { mode, pool: shuffle(pool), assignment: shuffle(pool), used: new Set(), picked: null, total: pool.length };
  }

  async function runRound(opts) {
    const run = ++runId;
    try {
      showScreen('stage');
      if (opts.fresh) { resetStage(); stageHat.clearSlips(); }
      else resetStage();
      await wait(150);
      if (opts.fresh) await phaseWriting(run, game.mode);
      await phaseShake(run, !opts.fresh);
      await phaseReach(run, game.mode, game.picked);
      await phaseSuspense(run);
      const slip = drawSlip(game.mode, game.picked);
      if (game.mode === 'number') game.used.add(game.picked);
      await phaseReveal(run, slip, game.mode);
    } catch (e) {
      if (!(e instanceof Cancelled)) { console.error(e); abort(); }
    }
  }
  function abort() {
    runId++;
    hideResult();
    resetStage();
    showScreen('home');
  }

  /* ---------------- pick a number ---------------- */
  function renderGrid() {
    const grid = $('#number-grid');
    grid.innerHTML = '';
    const N = game.total;
    game.picked = null;
    $('#picked-display').textContent = '?';
    $('#btn-lock').disabled = true;
    for (let n = 1; n <= N; n++) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tile'; b.textContent = n; b.dataset.n = n;
      b.style.setProperty('--hue', String((n * 47) % 360));
      if (game.used.has(n)) { b.classList.add('used'); b.disabled = true; }
      b.addEventListener('click', () => {
        Sfx.unlock(); Sfx.tap();
        $$('.tile.sel').forEach((t) => t.classList.remove('sel'));
        b.classList.add('sel');
        game.picked = n;
        const d = $('#picked-display');
        d.textContent = n; d.classList.remove('pop'); void d.offsetWidth; d.classList.add('pop');
        $('#btn-lock').disabled = false;
      });
      grid.appendChild(b);
    }
  }

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
    $$('.seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.themeChoice === S.effectiveTheme()));
    $('#set-skin-toggle').checked = s.setSkin;
    $('#skin-swatches').hidden = !s.setSkin;
    $('#skin-help').textContent = s.setSkin ? 'Pick the skin tone of the hand.' : 'Off = a new random hand every session.';
    const sw = $('#skin-swatches');
    sw.innerHTML = '';
    for (const t of S.SKIN_TONES) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'swatch' + (t.id === s.skinTone ? ' active' : ''); b.style.background = t.hex; b.title = t.id; b.setAttribute('aria-label', t.id);
      b.addEventListener('click', () => { S.set({ skinTone: t.id }); look.skin = t.hex; rebuildHands(); renderSettings(); Sfx.tap(); });
      sw.appendChild(b);
    }
    const hatSel = $('#set-hat');
    if (!hatSel.options.length) for (const h of S.HAT_COLORS) { const o = document.createElement('option'); o.value = h.id; o.textContent = h.name; hatSel.appendChild(o); }
    hatSel.value = s.hatColor;
    hatSel.style.setProperty('--sw', S.hatHex());
    const chips = $('#amount-chips');
    chips.innerHTML = '';
    for (const v of s.amounts) {
      const c = document.createElement('button');
      c.type = 'button'; c.className = 'chip'; c.innerHTML = `${formatMoney(v)}<span>✕</span>`;
      c.addEventListener('click', () => { S.setAmounts(s.amounts.filter((x) => x !== v)); renderSettings(); updateSummary(); Sfx.tap(); });
      chips.appendChild(c);
    }
    $('#set-again').value = s.chooseAgain;
    $('#set-wild').value = s.wild;
    $('#set-bg').value = s.background;
    $('#set-sound').checked = s.sound;
  }
  function wireSettings() {
    $('#btn-menu').addEventListener('click', () => { Sfx.unlock(); renderSettings(); openDrawer(); });
    $('#btn-close-drawer').addEventListener('click', closeDrawer);
    backdrop.addEventListener('click', closeDrawer);
    $$('.seg-btn').forEach((b) => b.addEventListener('click', () => { S.set({ theme: b.dataset.themeChoice }); S.applyTheme(); renderSettings(); Sfx.tap(); }));
    $('#set-skin-toggle').addEventListener('change', (e) => {
      S.set({ setSkin: e.target.checked });
      look.skin = e.target.checked ? S.skinHex() : pick(S.SKIN_TONES).hex;
      rebuildHands(); renderSettings();
    });
    $('#btn-reroll-hand').addEventListener('click', () => {
      look = Hand.randomLook(S.get().setSkin ? S.skinHex() : null);
      rebuildHands(); Sfx.pop();
      const m = $('.hand-mini'); m.classList.remove('spin'); void m.offsetWidth; m.classList.add('spin');
    });
    $('#set-hat').addEventListener('change', (e) => { S.set({ hatColor: e.target.value }); rebuildHats(); renderSettings(); Sfx.tap(); });
    const addAmount = () => {
      const inp = $('#amount-input');
      const v = parseFloat(inp.value);
      if (!Number.isFinite(v) || v < 0) { inp.classList.add('shake'); setTimeout(() => inp.classList.remove('shake'), 400); return; }
      S.setAmounts(S.get().amounts.concat([v]));
      inp.value = '';
      renderSettings(); updateSummary(); Sfx.pop();
    };
    $('#btn-add-amount').addEventListener('click', addAmount);
    $('#amount-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addAmount(); } });
    $('#set-again').addEventListener('change', (e) => { S.set({ chooseAgain: clamp(parseInt(e.target.value, 10) || 0, 0, 50) }); renderSettings(); updateSummary(); });
    $('#set-wild').addEventListener('change', (e) => { S.set({ wild: clamp(parseInt(e.target.value, 10) || 0, 0, 50) }); renderSettings(); updateSummary(); });
    $('#btn-reset-amounts').addEventListener('click', () => { S.resetAmounts(); renderSettings(); updateSummary(); Sfx.pop(); });
    $('#set-bg').addEventListener('change', (e) => { S.set({ background: e.target.value }); Sfx.tap(); });
    $('#set-sound').addEventListener('change', (e) => { S.set({ sound: e.target.checked }); Sfx.setEnabled(e.target.checked); if (e.target.checked) { Sfx.unlock(); Sfx.pop(); } });
  }

  /* ---------------- buttons ---------------- */
  function wireButtons() {
    $('#btn-mode-value').addEventListener('click', () => {
      Sfx.unlock(); Sfx.pop();
      newGame('value');
      runRound({ fresh: true });
    });
    $('#btn-mode-number').addEventListener('click', () => {
      Sfx.unlock(); Sfx.pop();
      newGame('number');
      renderGrid();
      showScreen('pick');
    });
    $('#btn-lock').addEventListener('click', () => {
      if (!game || !game.picked) return;
      Sfx.unlock(); Sfx.swoosh();
      runRound({ fresh: game.used.size === 0 });
    });
    $('#btn-abort').addEventListener('click', () => { Sfx.tap(); abort(); });
    $('#btn-home').addEventListener('click', () => { Sfx.tap(); abort(); });
    $('#btn-replay').addEventListener('click', () => { Sfx.pop(); abort(); });
    $('#btn-again').addEventListener('click', () => {
      Sfx.pop();
      hideResult();
      if (game.mode === 'number') { renderGrid(); showScreen('pick'); }
      else runRound({ fresh: false });
    });
  }

  /* ---------------- boot ---------------- */
  function boot() {
    Sfx.setEnabled(S.get().sound);
    buildPreview(); buildMini(); buildStage();
    renderSettings(); updateSummary();
    wireSettings(); wireButtons();
    showScreen('home');
    if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
    // expose a little for testing
    window.TipHat = { get game() { return game; }, get look() { return look; }, runRound, newGame, showResult, hideResult, abort };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
