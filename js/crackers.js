/* Firecrackers and small rockets that shoot up from behind the result card on the win screen.
   The launch pad sits behind the card, so the rockets only show once they clear its top edge.
   Crackers.fire(canvas, cardRect, skin) / Crackers.stop(). */
(() => {
  const TWO_PI = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const COLORS = {
    ember: ['#FF4514', '#FF6A3D', '#F2B63B', '#FFD98A', '#F3EAE4'],
    party: ['#ff2d95', '#ffe600', '#00e5ff', '#7cff3e', '#ff7a00', '#ffffff'],
  };
  const GRAVITY = 520;

  let raf = 0, canvas = null, ctx = null, last = 0, S = null;

  function fit() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return [w, h];
  }

  function launch() {
    const pad = S.pad;
    const x = pad.x + rand(-pad.half * 0.45, pad.half * 0.45);
    const apex = Math.max(36, pad.top - rand(90, 230));       // burst height above the card
    const vy = -Math.sqrt(2 * GRAVITY * (pad.y - apex));       // just enough speed to get there
    S.rockets.push({ x, y: pad.y, vx: rand(-45, 45), vy, c: pick(S.colors), trail: [] });
    if (window.Sfx) Sfx.whistleUp();
  }
  function explode(r) {
    const n = randInt(40, 70), base = rand(90, 170), c2 = pick(S.colors);
    for (let i = 0; i < n; i++) {
      const a = rand(0, TWO_PI), sp = base * (0.4 + 0.6 * Math.sqrt(Math.random()));
      S.sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, c: Math.random() < 0.5 ? r.c : c2, life: rand(0.8, 1.6), age: 0, size: rand(1.6, 3) });
    }
    S.pops.push({ x: r.x, y: r.y, age: 0, r: 90, c: r.c, dur: 0.3 });
    if (window.Sfx) { Sfx.boom(); Sfx.crackle(); }
  }
  function cracker() {
    // a firecracker pops right at the card's top edge: a quick flash and a few short sparks
    const pad = S.pad;
    const x = pad.x + rand(-pad.half * 0.85, pad.half * 0.85), y = pad.top - rand(2, 34);
    const c = pick(S.colors);
    for (let i = 0; i < randInt(8, 14); i++) {
      const a = rand(Math.PI, TWO_PI) + rand(-0.4, 0.4), sp = rand(60, 170); // mostly upward
      S.sparks.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, c, life: rand(0.25, 0.55), age: 0, size: rand(1.2, 2.2) });
    }
    S.pops.push({ x, y, age: 0, r: rand(14, 24), c, dur: 0.14 });
    if (window.Sfx) Sfx.crackerPop();
  }

  function step(dt) {
    S.t += dt;
    while (S.queue.length && S.queue[0].at <= S.t) { const q = S.queue.shift(); if (q.kind === 'rocket') launch(); else cracker(); }
    for (let i = S.rockets.length - 1; i >= 0; i--) {
      const r = S.rockets[i];
      r.trail.push({ x: r.x, y: r.y, age: 0 });
      if (r.trail.length > 12) r.trail.shift();
      r.x += r.vx * dt; r.y += r.vy * dt; r.vy += GRAVITY * dt;
      for (const tp of r.trail) tp.age += dt;
      if (r.vy > -40) { explode(r); S.rockets.splice(i, 1); }
    }
    for (let i = S.sparks.length - 1; i >= 0; i--) {
      const p = S.sparks[i];
      p.age += dt; p.vy += 130 * dt; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.age > p.life) S.sparks.splice(i, 1);
    }
    for (let i = S.pops.length - 1; i >= 0; i--) { S.pops[i].age += dt; if (S.pops[i].age > S.pops[i].dur) S.pops.splice(i, 1); }
  }
  function draw() {
    const w = canvas.clientWidth || S.w, h = canvas.clientHeight || S.h;
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    for (const f of S.pops) {
      const u = f.age / f.dur;
      const rg = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * (0.5 + u));
      rg.addColorStop(0, f.c + Math.round(0.8 * (1 - u) * 255).toString(16).padStart(2, '0')); rg.addColorStop(1, f.c + '00');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.5 + u), 0, TWO_PI); ctx.fill();
    }
    for (const r of S.rockets) {
      for (const tp of r.trail) { ctx.globalAlpha = clamp(1 - tp.age * 4, 0, 1) * 0.8; ctx.fillStyle = r.c; ctx.beginPath(); ctx.arc(tp.x, tp.y, 2, 0, TWO_PI); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(r.x, r.y, 2.6, 0, TWO_PI); ctx.fill();
    }
    for (const p of S.sparks) {
      const u = p.age / p.life;
      ctx.globalAlpha = clamp(1 - u * u, 0, 1);
      ctx.fillStyle = u < 0.15 ? '#fff' : p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - u * 0.5), 0, TWO_PI); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    step(dt); draw();
    if (!S.queue.length && !S.rockets.length && !S.sparks.length && !S.pops.length) { stop(); return; }
    raf = requestAnimationFrame(loop);
  }

  function fire(cv, rect, skin, opts) {
    stop();
    canvas = cv; ctx = cv.getContext('2d');
    const [w, h] = fit();
    const o = opts || {};
    S = {
      t: 0, w, h, colors: COLORS[skin] || COLORS.ember,
      pad: { x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.55, top: rect.top, half: rect.width / 2 },
      rockets: [], sparks: [], pops: [], queue: [],
    };
    const rockets = o.rockets === undefined ? 5 : o.rockets, crackers = o.crackers === undefined ? 14 : o.crackers;
    let at = 0;
    for (let i = 0; i < rockets; i++) { S.queue.push({ at, kind: 'rocket' }); at += rand(0.14, 0.3); }
    for (let i = 0; i < crackers; i++) S.queue.push({ at: rand(0.05, 1.4), kind: 'cracker' });
    S.queue.sort((a, b) => a.at - b.at);
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf); raf = 0;
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    S = null;
  }

  window.Crackers = { fire, stop, get active() { return !!S; } };
})();
