/* Full-screen canvas celebrations: crowd (panoramic scroll with letter signs), confetti,
   stars expanding into view, and fireworks. Celebrate.start(canvas, mode) / Celebrate.stop(). */
(function () {
  'use strict';
  const { rand, randInt, pick, clamp, lerp } = U;
  const SKINS = ['#FADCBC', '#F3C7A1', '#E8B590', '#D9A077', '#C68642', '#B07A4B', '#8D5524', '#6E4426', '#4E2E1E', '#3B2419'];
  // Two palettes: the Ember & Espresso one (ember, its tints, taupe, white, the gold and green accents on warm grounds)
  // and the party one from the app's first look (neon everything).
  const PALETTES = {
    ember: {
      bright: ['#FF4514', '#FF6A3D', '#FFDCCF', '#C4B0A6', '#FFFFFF', '#E8B04A', '#5CC48A', '#FF4514'],
      shirts: ['#FF4514', '#895946', '#8A3C20', '#C4B0A6', '#3D2C22', '#F3EAE4', '#E8B04A', '#5CC48A'],
      fire: ['#FF4514', '#FF6A3D', '#E8B04A', '#FFFFFF', '#C4B0A6', '#5CC48A', '#FFDCCF'],
      hair: ['#1b1b1b', '#3b2a1a', '#6b3e1e', '#c98b3a', '#e8d49a', '#8a1c1c', '#C4B0A6'],
      signs: ['#FF4514'], signBorder: '#C4B0A6', foam: ['#F3EAE4', '#FF4514'],
      lights: [{ x: 0.1, ph: 0, c: '#FF4514' }, { x: 0.9, ph: 2, c: '#C4B0A6' }, { x: 0.5, ph: 4, c: '#E8B04A' }],
      crowdBg: ['#110E0B', '#261F1A', '#8A3C20'], fireBg: ['#110E0B', '#261F1A', '#3D2C22'], starsBg: ['#3D2C22', '#1a1310', '#110E0B'],
      warp: ['#ffffff', '#E8B04A', '#FF6A3D', '#C4B0A6', '#ffffff', '#ffffff'], bigStars: ['#E8B04A', '#ffffff', '#FF6A3D', '#C4B0A6', '#FFDCCF', '#FF4514'],
      confettiBg: (ctx, w, h) => { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#8A3C20'); g.addColorStop(0.45, '#3D2C22'); g.addColorStop(1, '#110E0B'); return g; },
      rays: '#FF4514', tint: '#110E0B',
    },
    party: {
      bright: ['#ff2d95', '#ffe600', '#00e5ff', '#7cff3e', '#ff7a00', '#b14cff', '#ff3b30', '#1de9b6', '#ffffff', '#ff6ec7'],
      shirts: ['#ff2d95', '#ffe600', '#00e5ff', '#7cff3e', '#ff7a00', '#b14cff', '#ff3b30', '#1de9b6', '#ff6ec7'],
      fire: ['#ff2d95', '#ffe600', '#00e5ff', '#7cff3e', '#ff7a00', '#b14cff', '#ff3b30', '#ffffff', '#ff6ec7'],
      hair: ['#1b1b1b', '#3b2a1a', '#6b3e1e', '#c98b3a', '#e8d49a', '#8a1c1c', '#ff2d95', '#2d7dff', '#7cff3e', '#b14cff'],
      signs: ['#ff2d95', '#2d7dff', '#ff7a00', '#7d2ae8', '#e0222e', '#1f9d4b', '#13b5b1'], signBorder: null, foam: ['#ffe600', '#e0222e'],
      lights: [{ x: 0.1, ph: 0, c: '#ff2d95' }, { x: 0.9, ph: 2, c: '#00e5ff' }, { x: 0.5, ph: 4, c: '#ffe600' }],
      crowdBg: ['#0d0624', '#2a0b4e', '#4b1272'], fireBg: ['#070a24', '#1b0b3f', '#3a0b5e'], starsBg: ['#2b1a66', '#140a33', '#05030f'],
      warp: ['#ffffff', '#ffe600', '#00e5ff', '#ff6ec7', '#ffffff', '#ffffff'], bigStars: ['#ffe600', '#ffffff', '#00e5ff', '#ff6ec7', '#7cff3e', '#ffb340'],
      confettiBg: (ctx, w, h, t) => { const hue = (t * 25) % 360; const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, `hsl(${hue},95%,62%)`); g.addColorStop(0.5, `hsl(${(hue + 50) % 360},95%,58%)`); g.addColorStop(1, `hsl(${(hue + 110) % 360},95%,55%)`); return g; },
      rays: '#ffffff', tint: '#1a0b3a',
    },
  };
  let P = PALETTES.ember;
  const TWO_PI = Math.PI * 2;

  function starPath(ctx, cx, cy, rOuter, rInner, n, rot) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 === 0 ? rOuter : rInner;
      const a = (rot || 0) - Math.PI / 2 + (i * Math.PI) / n;
      const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
  function heartPoint(t) { // parametric heart, roughly unit sized
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    return [x / 17, y / 17];
  }

  /* ---------------- CONFETTI ---------------- */
  class Confetti {
    init(w, h) {
      this.w = w; this.h = h; this.t = 0;
      this.rain = [];
      const n = clamp(Math.round((w * h) / 3800), 110, 260);
      for (let i = 0; i < n; i++) this.rain.push(this.spawn(true));
      this.burst = [];
      for (let i = 0; i < 160; i++) {
        const a = rand(0, TWO_PI), sp = rand(200, 700);
        this.burst.push({ x: w / 2, y: h / 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 150, w: rand(6, 12), h: rand(10, 20), c: pick(P.bright), ang: rand(0, TWO_PI), av: rand(-8, 8), flip: rand(0, TWO_PI), fv: rand(3, 9), life: rand(1.6, 2.8), age: 0, round: Math.random() < 0.25 });
      }
    }
    spawn(anywhere) {
      return { x: rand(0, this.w), y: anywhere ? rand(-this.h, this.h) : rand(-60, -10), vy: rand(70, 170), sway: rand(20, 60), ph: rand(0, TWO_PI), sw: rand(1, 3), w: rand(6, 12), h: rand(10, 20), c: pick(P.bright), ang: rand(0, TWO_PI), av: rand(-3, 3), flip: rand(0, TWO_PI), fv: rand(2, 6), round: Math.random() < 0.25, ribbon: Math.random() < 0.15 };
    }
    step(dt) {
      this.t += dt;
      for (let i = 0; i < this.rain.length; i++) {
        const p = this.rain[i];
        p.y += p.vy * dt; p.ph += p.sw * dt; p.x += Math.cos(p.ph) * p.sway * dt; p.ang += p.av * dt; p.flip += p.fv * dt;
        if (p.y > this.h + 30) this.rain[i] = this.spawn(false);
      }
      for (const p of this.burst) {
        p.age += dt; p.vy += 420 * dt; p.vx *= 0.985; p.vy *= 0.99; p.x += p.vx * dt; p.y += p.vy * dt; p.ang += p.av * dt; p.flip += p.fv * dt;
      }
      this.burst = this.burst.filter((p) => p.age < p.life);
    }
    drawPiece(ctx, p, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.ang);
      ctx.scale(1, Math.max(0.12, Math.abs(Math.cos(p.flip))));
      ctx.fillStyle = p.c;
      if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.w * 0.6, 0, TWO_PI); ctx.fill(); }
      else if (p.ribbon) { ctx.beginPath(); ctx.moveTo(-p.w / 2, -p.h); ctx.quadraticCurveTo(p.w, -p.h / 2, -p.w / 2, 0); ctx.quadraticCurveTo(p.w, p.h / 2, -p.w / 2, p.h); ctx.lineWidth = 3; ctx.strokeStyle = p.c; ctx.stroke(); }
      else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    draw(ctx, w, h) {
      ctx.fillStyle = P.confettiBg(ctx, w, h, this.t); ctx.fillRect(0, 0, w, h);
      // soft rays
      ctx.save(); ctx.globalAlpha = 0.16; ctx.translate(w / 2, h / 2); ctx.rotate(this.t * 0.25);
      for (let i = 0; i < 10; i++) { ctx.rotate(TWO_PI / 10); ctx.fillStyle = P.rays; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w * 1.5, -w * 0.12); ctx.lineTo(w * 1.5, w * 0.12); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      for (const p of this.rain) this.drawPiece(ctx, p, 0.95);
      for (const p of this.burst) this.drawPiece(ctx, p, clamp(1 - (p.age / p.life - 0.7) / 0.3, 0, 1));
    }
  }

  /* ---------------- STARS ---------------- */
  class Stars {
    init(w, h) {
      this.w = w; this.h = h; this.t = 0;
      this.cx = w / 2; this.cy = h / 2;
      this.warp = [];
      for (let i = 0; i < 170; i++) this.warp.push(this.spawnWarp(true));
      this.big = [];
      for (let i = 0; i < 22; i++) this.big.push(this.spawnBig(rand(0, 2.5)));
    }
    spawnWarp(any) {
      const a = rand(0, TWO_PI);
      return { a, r: any ? rand(4, Math.max(this.w, this.h) * 0.7) : rand(2, 30), c: pick(P.warp), sp: rand(0.9, 1.6) };
    }
    spawnBig(age) {
      return { x: rand(0.05, 0.95) * this.w, y: rand(0.05, 0.95) * this.h, age: age || 0, life: rand(2.4, 4.2), size: rand(14, 42), c: pick(P.bigStars), rot: rand(0, TWO_PI), rv: rand(-0.8, 0.8), tw: rand(4, 9) };
    }
    step(dt) {
      this.t += dt;
      const maxR = Math.max(this.w, this.h) * 0.75;
      for (let i = 0; i < this.warp.length; i++) {
        const s = this.warp[i];
        s.r += (s.r * 1.3 + 50) * s.sp * dt;
        if (s.r > maxR) this.warp[i] = this.spawnWarp(false);
      }
      for (let i = 0; i < this.big.length; i++) {
        const b = this.big[i];
        b.age += dt; b.rot += b.rv * dt;
        if (b.age > b.life) this.big[i] = this.spawnBig(0);
      }
    }
    draw(ctx, w, h) {
      const g = ctx.createRadialGradient(this.cx, this.cy, 10, this.cx, this.cy, Math.max(w, h) * 0.8);
      g.addColorStop(0, P.starsBg[0]); g.addColorStop(0.6, P.starsBg[1]); g.addColorStop(1, P.starsBg[2]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // warp streaks
      ctx.lineCap = 'round';
      for (const s of this.warp) {
        const x = this.cx + Math.cos(s.a) * s.r, y = this.cy + Math.sin(s.a) * s.r;
        const tail = Math.min(s.r * 0.22, 60);
        const x2 = this.cx + Math.cos(s.a) * (s.r - tail), y2 = this.cy + Math.sin(s.a) * (s.r - tail);
        const size = clamp(0.6 + s.r / 90, 0.6, 5);
        ctx.strokeStyle = s.c; ctx.globalAlpha = clamp(s.r / 160, 0.15, 1); ctx.lineWidth = size;
        ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x, y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // big stars popping into view
      for (const b of this.big) {
        const u = b.age / b.life;
        const pop = u < 0.25 ? U.ease.outBack(u / 0.25) : 1;
        const fade = u > 0.8 ? 1 - (u - 0.8) / 0.2 : 1;
        const tw = 0.75 + 0.25 * Math.sin(b.age * b.tw);
        const size = b.size * pop * tw;
        if (size <= 0.1) continue;
        ctx.save();
        ctx.globalAlpha = fade;
        const halo = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, size * 2.2);
        halo.addColorStop(0, b.c); halo.addColorStop(0.3, b.c + '66'); halo.addColorStop(1, b.c + '00');
        ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(b.x, b.y, size * 2.2, 0, TWO_PI); ctx.fill();
        ctx.fillStyle = '#fff';
        starPath(ctx, b.x, b.y, size, size * 0.42, 5, b.rot); ctx.fill();
        ctx.fillStyle = b.c; ctx.globalAlpha = fade * 0.8;
        starPath(ctx, b.x, b.y, size * 0.72, size * 0.3, 5, b.rot); ctx.fill();
        ctx.restore();
      }
    }
  }

  /* ---------------- FIREWORKS ---------------- */
  class Fireworks {
    init(w, h) {
      this.w = w; this.h = h; this.t = 0; this.next = 0;
      this.rockets = []; this.parts = []; this.flashes = [];
      this.bgStars = [];
      for (let i = 0; i < 70; i++) this.bgStars.push({ x: rand(0, w), y: rand(0, h * 0.8), r: rand(0.5, 1.6), ph: rand(0, TWO_PI) });
      this.launch(w * 0.5); this.launch(w * 0.25); this.launch(w * 0.75);
      this.next = 0.5;
    }
    launch(x) {
      this.rockets.push({ x: x !== undefined ? x : rand(this.w * 0.12, this.w * 0.88), y: this.h + 10, vx: rand(-30, 30), vy: -rand(this.h * 0.95, this.h * 1.35), c: pick(P.fire), trail: [] });
      if (window.Sfx) Sfx.whistleUp();
    }
    explode(r) {
      const shape = Math.random() < 0.2 ? 'heart' : Math.random() < 0.25 ? 'ring' : 'burst';
      const n = shape === 'burst' ? randInt(70, 110) : 80;
      const c2 = pick(P.fire);
      const base = rand(120, 240);
      for (let i = 0; i < n; i++) {
        let vx, vy;
        if (shape === 'heart') { const [hx, hy] = heartPoint((i / n) * TWO_PI); vx = hx * base * 1.3; vy = hy * base * 1.3; }
        else if (shape === 'ring') { const a = (i / n) * TWO_PI; vx = Math.cos(a) * base * 1.2; vy = Math.sin(a) * base * 1.2; }
        else { const a = rand(0, TWO_PI), sp = base * Math.sqrt(Math.random()) * 1.3; vx = Math.cos(a) * sp; vy = Math.sin(a) * sp; }
        this.parts.push({ x: r.x, y: r.y, vx, vy, c: Math.random() < 0.5 ? r.c : c2, life: rand(1.1, 2.2), age: 0, size: rand(1.8, 3.4), tw: rand(8, 20), crackle: Math.random() < 0.15 });
      }
      this.flashes.push({ x: r.x, y: r.y, age: 0, c: r.c });
      if (window.Sfx) { Sfx.boom(); if (Math.random() < 0.5) Sfx.crackle(); }
    }
    step(dt) {
      this.t += dt; this.next -= dt;
      if (this.next <= 0) { this.launch(); this.next = rand(0.35, 0.9); }
      for (let i = this.rockets.length - 1; i >= 0; i--) {
        const r = this.rockets[i];
        r.trail.push({ x: r.x, y: r.y, age: 0 });
        if (r.trail.length > 14) r.trail.shift();
        r.x += r.vx * dt; r.y += r.vy * dt; r.vy += 520 * dt;
        for (const tp of r.trail) tp.age += dt;
        if (r.vy > -60 || r.y < this.h * 0.12) { this.explode(r); this.rockets.splice(i, 1); }
      }
      for (let i = this.parts.length - 1; i >= 0; i--) {
        const p = this.parts[i];
        p.age += dt; p.vy += 110 * dt; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.age > p.life) this.parts.splice(i, 1);
      }
      for (let i = this.flashes.length - 1; i >= 0; i--) { this.flashes[i].age += dt; if (this.flashes[i].age > 0.3) this.flashes.splice(i, 1); }
    }
    draw(ctx, w, h) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, P.fireBg[0]); g.addColorStop(0.6, P.fireBg[1]); g.addColorStop(1, P.fireBg[2]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#fff';
      for (const s of this.bgStars) { ctx.globalAlpha = 0.4 + 0.4 * Math.sin(this.t * 2 + s.ph); ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TWO_PI); ctx.fill(); }
      ctx.globalAlpha = 1;
      for (const f of this.flashes) {
        const u = f.age / 0.3;
        const rg = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 260 * (0.4 + u));
        rg.addColorStop(0, f.c + Math.round(0.5 * (1 - u) * 255).toString(16).padStart(2, '0')); rg.addColorStop(1, f.c + '00');
        ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
      }
      for (const r of this.rockets) {
        for (const tp of r.trail) { ctx.globalAlpha = clamp(1 - tp.age * 3, 0, 1) * 0.8; ctx.fillStyle = r.c; ctx.beginPath(); ctx.arc(tp.x, tp.y, 2.2, 0, TWO_PI); ctx.fill(); }
        ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(r.x, r.y, 3, 0, TWO_PI); ctx.fill();
      }
      for (const p of this.parts) {
        const u = p.age / p.life;
        const tw = p.crackle ? (Math.sin(p.age * p.tw) > 0 ? 1 : 0.2) : 0.75 + 0.25 * Math.sin(p.age * p.tw);
        ctx.globalAlpha = clamp((1 - u) * 1.3, 0, 1) * tw;
        ctx.fillStyle = u < 0.2 ? '#FFFFFF' : p.c;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 - u * 0.5), 0, TWO_PI); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  /* ---------------- CROWD ---------------- */
  class Crowd {
    init(w, h) {
      this.w = w; this.h = h; this.t = 0;
      this.phrase = 'WE GOT A WINNER!'.split('');
      this.spacing = 92;
      this.pw = this.phrase.length * this.spacing; // panorama width
      this.rows = [];
      const defs = [
        { y: 0.60, s: 0.62, tint: 0.55, count: Math.ceil(this.pw / 62) },
        { y: 0.74, s: 0.8, tint: 0.78, count: Math.ceil(this.pw / 78) },
        { y: 0.96, s: 1.0, tint: 1, count: this.phrase.length, signs: true },
      ];
      for (const d of defs) {
        const people = [];
        const sp = this.pw / d.count;
        for (let i = 0; i < d.count; i++) {
          const ch = d.signs ? this.phrase[i] : null;
          people.push({
            x: i * sp + (d.signs ? sp / 2 : rand(0, sp * 0.5)),
            shirt: pick(P.shirts), skin: pick(SKINS), hair: pick(P.hair), cap: Math.random() < 0.35, capColor: pick(P.shirts),
            ph: rand(0, TWO_PI), ph2: rand(0, TWO_PI), wf: rand(5, 9), bf: rand(3, 6),
            sign: ch && ch !== ' ' ? { ch, color: pick(P.signs), tilt: rand(-0.12, 0.12) } : null,
            foam: !ch && Math.random() < 0.15,
          });
        }
        this.rows.push({ y: d.y, s: d.s, tint: d.tint, people, signs: !!d.signs });
      }
      this.camSpeed = 95;
      this.flashes = [];
      this.confetti = [];
      for (let i = 0; i < 70; i++) this.confetti.push({ x: rand(0, w), y: rand(-h, h), vy: rand(60, 140), c: pick(P.bright), ang: rand(0, TWO_PI), av: rand(-4, 4), s: rand(5, 10) });
      this.lights = P.lights;
      this.nextFlash = 0;
    }
    step(dt) {
      this.t += dt;
      this.nextFlash -= dt;
      if (this.nextFlash <= 0) { this.flashes.push({ x: rand(0, this.w), y: rand(this.h * 0.35, this.h * 0.7), age: 0 }); this.nextFlash = rand(0.05, 0.25); }
      for (let i = this.flashes.length - 1; i >= 0; i--) { this.flashes[i].age += dt; if (this.flashes[i].age > 0.25) this.flashes.splice(i, 1); }
      for (const c of this.confetti) { c.y += c.vy * dt; c.ang += c.av * dt; if (c.y > this.h + 20) { c.y = -20; c.x = rand(0, this.w); } }
    }
    drawPerson(ctx, p, x, baseY, s, tint, t, withSign) {
      const bounce = Math.abs(Math.sin(t * p.bf + p.ph)) * 14 * s;
      const y = baseY - bounce;
      const shirt = tint < 1 ? U.mix(p.shirt, P.tint, 1 - tint) : p.shirt;
      const skin = tint < 1 ? U.mix(p.skin, P.tint, 1 - tint) : p.skin;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      // arms (behind body)
      const wave = Math.sin(t * p.wf + p.ph2) * 0.45;
      ctx.lineCap = 'round'; ctx.lineWidth = 11; ctx.strokeStyle = skin;
      const armL = -2.2 - wave, armR = -0.9 + wave;
      const lx = -20 + Math.cos(armL) * 44, ly = -52 + Math.sin(armL) * 44;
      const rx = 20 + Math.cos(armR) * 44, ry = -52 + Math.sin(armR) * 44;
      ctx.beginPath(); ctx.moveTo(-20, -52); ctx.lineTo(lx, ly); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(20, -52); ctx.lineTo(rx, ry); ctx.stroke();
      ctx.fillStyle = skin;
      ctx.beginPath(); ctx.arc(lx, ly, 7, 0, TWO_PI); ctx.fill();
      ctx.beginPath(); ctx.arc(rx, ry, 7, 0, TWO_PI); ctx.fill();
      if (p.foam) { ctx.fillStyle = P.foam[0]; ctx.beginPath(); ctx.roundRect(lx - 12, ly - 34, 24, 34, 6); ctx.fill(); ctx.fillStyle = P.foam[1]; ctx.font = '800 18px "Jost", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('#1', lx, ly - 10); }
      // body
      ctx.fillStyle = shirt;
      ctx.beginPath(); ctx.roundRect(-24, -62, 48, 64, 12); ctx.fill();
      // head
      ctx.fillStyle = skin;
      ctx.beginPath(); ctx.arc(0, -80, 18, 0, TWO_PI); ctx.fill();
      // hair / cap
      if (p.cap) { ctx.fillStyle = p.capColor; ctx.beginPath(); ctx.arc(0, -82, 19, Math.PI, 0); ctx.fill(); ctx.fillRect(-26, -84, 40, 6); }
      else { ctx.fillStyle = p.hair; ctx.beginPath(); ctx.arc(0, -84, 18, Math.PI * 1.05, Math.PI * 1.95); ctx.fill(); }
      // face: wide eyes + cheering mouth
      ctx.fillStyle = '#1b1b1b';
      ctx.beginPath(); ctx.arc(-6, -82, 2.4, 0, TWO_PI); ctx.arc(6, -82, 2.4, 0, TWO_PI); ctx.fill();
      ctx.fillStyle = '#7a1b2e';
      ctx.beginPath(); ctx.ellipse(0, -72, 6, 4 + 2 * Math.abs(Math.sin(t * 7 + p.ph)), 0, 0, TWO_PI); ctx.fill();
      // sign on a stick in the right hand
      if (withSign && p.sign) {
        ctx.save();
        ctx.translate(rx, ry);
        ctx.rotate(p.sign.tilt + Math.sin(t * 3 + p.ph) * 0.08);
        ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -40); ctx.stroke();
        ctx.fillStyle = P.signBorder ? '#F3EAE4' : '#fffdf2'; ctx.strokeStyle = P.signBorder || p.sign.color; ctx.lineWidth = P.signBorder ? 4 : 5;
        ctx.beginPath(); ctx.roundRect(-34, -108, 68, 68, 8); ctx.fill(); ctx.stroke();
        ctx.fillStyle = p.sign.color; ctx.font = '800 50px "Jost", "Futura", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(p.sign.ch, 0, -72);
        ctx.restore();
      }
      ctx.restore();
    }
    draw(ctx, w, h) {
      const t = this.t;
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, P.crowdBg[0]); g.addColorStop(0.55, P.crowdBg[1]); g.addColorStop(1, P.crowdBg[2]);
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // sweeping spotlights
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const L of this.lights) {
        const a = Math.PI / 2 + Math.sin(t * 0.9 + L.ph) * 0.7;
        ctx.save(); ctx.translate(L.x * w, -10); ctx.rotate(a - Math.PI / 2);
        const lg = ctx.createLinearGradient(0, 0, 0, h * 1.3);
        lg.addColorStop(0, L.c + 'aa'); lg.addColorStop(1, L.c + '00');
        ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-w * 0.22, h * 1.3); ctx.lineTo(w * 0.22, h * 1.3); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
      // camera flashes in the stands
      for (const f of this.flashes) { const u = f.age / 0.25; ctx.globalAlpha = (1 - u) * 0.9; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(f.x, f.y, 4 + 18 * u, 0, TWO_PI); ctx.fill(); }
      ctx.globalAlpha = 1;
      // rows, scrolling panorama with wrap-around
      const cam = (t * this.camSpeed) % this.pw;
      for (const row of this.rows) {
        const baseY = row.y * h;
        const par = row.s; // parallax: back rows scroll slower
        const camRow = (cam * par) % this.pw;
        for (const p of row.people) {
          for (const off of [-this.pw, 0, this.pw]) {
            const x = p.x - camRow + off + w * 0.5 - this.pw * 0.5 + this.pw * 0.5;
            if (x < -80 || x > w + 80) continue;
            this.drawPerson(ctx, p, x, baseY, row.s, row.tint, t, !!row.signs);
          }
        }
      }
      // foreground confetti
      for (const c of this.confetti) { ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.ang); ctx.fillStyle = c.c; ctx.fillRect(-c.s / 2, -c.s / 3, c.s, c.s / 1.5); ctx.restore(); }
    }
  }

  const MODES = { confetti: Confetti, stars: Stars, fireworks: Fireworks, crowd: Crowd };

  let raf = 0, scene = null, canvas = null, ctx = null, last = 0, resizeHandler = null;

  function fit() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return [w, h];
  }

  const Celebrate = {
    MODES: Object.keys(MODES),
    start(cv, mode, skin) {
      Celebrate.stop();
      P = PALETTES[skin] || PALETTES.ember;
      canvas = cv; ctx = cv.getContext('2d');
      if (!ctx.roundRect) ctx.roundRect = function (x, y, w, h, r) { this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r); this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath(); };
      const [w, h] = fit();
      scene = new (MODES[mode] || Confetti)();
      scene.init(w, h);
      last = performance.now();
      const loop = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        scene.step(dt);
        scene.draw(ctx, canvas.clientWidth || w, canvas.clientHeight || h);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      resizeHandler = () => { const [nw, nh] = fit(); scene.w = nw; scene.h = nh; if (scene.cx !== undefined) { scene.cx = nw / 2; scene.cy = nh / 2; } };
      window.addEventListener('resize', resizeHandler);
    },
    stop() {
      if (raf) cancelAnimationFrame(raf); raf = 0; scene = null;
      if (resizeHandler) window.removeEventListener('resize', resizeHandler); resizeHandler = null;
      if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
  window.Celebrate = Celebrate;
})();
