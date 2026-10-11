/* The hand. A dorsal view: forearm comes in from the top, fingers point down, thumb on the right.
   Hand.randomLook() rolls skin tone + accessories. Hand.create(group, look) builds the SVG and
   returns a rig whose pose (position, rotation, finger curl, thumb angle, held item) can be set. */
(function () {
  'use strict';
  const { svg, shade, mix, pick, chance, randInt, rand, lerp } = U;

  const METALS = {
    gold: { a: '#fff1a8', b: '#e8b414', c: '#9c6f05' },
    silver: { a: '#ffffff', b: '#c9d0d8', c: '#6f7a86' },
    rose: { a: '#ffe3d6', b: '#e8a089', c: '#9c5a46' },
    black: { a: '#8a8a95', b: '#2d2d35', c: '#0b0b0f' },
  };
  const GEMS = ['#e0115f', '#0f52ba', '#50c878', '#e6f7ff', '#9966cc', '#ff8c00', '#111'];
  const POLISH = ['#ff2d55', '#ff6ec7', '#ff3b30', '#b14cff', '#00c2ff', '#1de9b6', '#ffd60a', '#ff7a00', '#15151a', '#f8f8ff', '#8e0038', '#0bd3ff'];
  const BEAD_THEMES = [
    ['#ff6b6b', '#ffd93d', '#6bcB77', '#4d96ff', '#ff9f1c', '#c77dff'],
    ['#f6c1d1', '#c1e1f6', '#d4f6c1', '#fff1c1', '#e8c1f6'],
    ['#8b5a2b', '#a0522d', '#c68642', '#5c3a1e', '#d2a679'],
    ['#101010', '#f5f5f5', '#101010', '#f5f5f5'],
    ['#00e5ff', '#ff2d95', '#ffe600', '#7cff3e'],
  ];
  const KNUCKLE_WORDS = ['LOVE', 'HOPE', 'LUCK', 'TIPS', 'GAME', 'COOL', 'LIFE'];
  const INK = ['#1b2a49', '#15151a', '#1f4d2e', '#3a1f5c'];

  /* ---------- tattoo designs, each drawn in a 100x100 box ---------- */
  function starPoints(cx, cy, rOuter, rInner, n) {
    const pts = [];
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 === 0 ? rOuter : rInner;
      const a = -Math.PI / 2 + (i * Math.PI) / n;
      pts.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1));
    }
    return pts.join(' ');
  }
  const TATTOOS = {
    heart: (ink) => [svg('path', { d: 'M50,86 C22,62 10,44 18,28 C26,13 44,14 50,28 C56,14 74,13 82,28 C90,44 78,62 50,86 Z', fill: ink })],
    momHeart: (ink) => [
      svg('path', { d: 'M50,88 C20,62 8,44 17,27 C26,12 45,13 50,27 C55,13 74,12 83,27 C92,44 80,62 50,88 Z', fill: '#d6264a' }),
      svg('path', { d: 'M12,52 L88,46 L86,62 L10,68 Z', fill: '#fff6d8', stroke: ink, 'stroke-width': 2 }),
      svg('text', { x: 49, y: 62, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: ink, 'font-family': 'Georgia, serif', transform: 'rotate(-4 49 57)' }, ['MOM']),
    ],
    star: (ink) => [svg('polygon', { points: starPoints(50, 52, 40, 17, 5), fill: ink })],
    anchor: (ink) => [
      svg('circle', { cx: 50, cy: 16, r: 8, fill: 'none', stroke: ink, 'stroke-width': 6 }),
      svg('path', { d: 'M50,24 L50,88 M30,36 L70,36', stroke: ink, 'stroke-width': 7, 'stroke-linecap': 'round', fill: 'none' }),
      svg('path', { d: 'M16,58 C22,80 36,90 50,90 C64,90 78,80 84,58 L72,64 C70,74 60,80 50,80 C40,80 30,74 28,64 Z', fill: ink }),
    ],
    lightning: (ink) => [svg('polygon', { points: '58,6 22,56 46,56 38,94 78,40 54,40 64,6', fill: ink })],
    flower: (ink) => {
      const els = [];
      for (let i = 0; i < 6; i++) els.push(svg('ellipse', { cx: 50, cy: 28, rx: 11, ry: 22, fill: ink, transform: `rotate(${i * 60} 50 50)` }));
      els.push(svg('circle', { cx: 50, cy: 50, r: 11, fill: '#ffd166' }));
      return els;
    },
    skull: (ink) => [
      svg('path', { d: 'M50,8 C24,8 14,28 14,46 C14,58 22,66 30,70 L30,86 L70,86 L70,70 C78,66 86,58 86,46 C86,28 76,8 50,8 Z', fill: ink }),
      svg('circle', { cx: 36, cy: 46, r: 9, fill: '#fff' }), svg('circle', { cx: 64, cy: 46, r: 9, fill: '#fff' }),
      svg('path', { d: 'M50,56 L45,66 L55,66 Z', fill: '#fff' }),
      svg('path', { d: 'M40,78 L40,86 M50,78 L50,86 M60,78 L60,86', stroke: '#fff', 'stroke-width': 3 }),
    ],
    butterfly: (ink) => [
      svg('ellipse', { cx: 30, cy: 34, rx: 22, ry: 18, fill: ink, transform: 'rotate(-20 30 34)' }),
      svg('ellipse', { cx: 70, cy: 34, rx: 22, ry: 18, fill: ink, transform: 'rotate(20 70 34)' }),
      svg('ellipse', { cx: 33, cy: 66, rx: 16, ry: 13, fill: ink, transform: 'rotate(20 33 66)' }),
      svg('ellipse', { cx: 67, cy: 66, rx: 16, ry: 13, fill: ink, transform: 'rotate(-20 67 66)' }),
      svg('rect', { x: 46, y: 20, width: 8, height: 60, rx: 4, fill: '#ffd166' }),
      svg('path', { d: 'M50,20 L40,6 M50,20 L60,6', stroke: ink, 'stroke-width': 3, 'stroke-linecap': 'round' }),
    ],
    moon: (ink) => [
      svg('path', { d: 'M62,10 A40,40 0 1 0 62,90 A45.3,45.3 0 0 1 62,10 Z', fill: ink }),
      svg('polygon', { points: starPoints(74, 30, 8, 3.5, 5), fill: ink }),
      svg('polygon', { points: starPoints(84, 56, 6, 2.5, 5), fill: ink }),
    ],
    sun: (ink) => {
      const els = [svg('circle', { cx: 50, cy: 50, r: 20, fill: ink })];
      for (let i = 0; i < 10; i++) els.push(svg('path', { d: 'M50,24 L50,8', stroke: ink, 'stroke-width': 6, 'stroke-linecap': 'round', transform: `rotate(${i * 36} 50 50)` }));
      return els;
    },
    snake: (ink) => [
      svg('path', { d: 'M20,84 C20,60 80,70 80,46 C80,26 30,30 30,16', fill: 'none', stroke: ink, 'stroke-width': 9, 'stroke-linecap': 'round' }),
      svg('ellipse', { cx: 30, cy: 14, rx: 10, ry: 7, fill: ink }),
      svg('path', { d: 'M22,12 L10,8 M22,14 L10,16', stroke: '#d6264a', 'stroke-width': 2.5, 'stroke-linecap': 'round' }),
    ],
    diamond: (ink) => [
      svg('polygon', { points: '20,36 36,16 64,16 80,36 50,88', fill: ink }),
      svg('path', { d: 'M20,36 L80,36 M36,16 L44,36 L50,88 M64,16 L56,36', stroke: '#fff', 'stroke-width': 2.5, 'stroke-opacity': 0.8, fill: 'none' }),
    ],
    crown: (ink) => [svg('polygon', { points: '12,80 8,28 32,50 50,16 68,50 92,28 88,80', fill: ink }), svg('circle', { cx: 50, cy: 14, r: 5, fill: '#ffd166' })],
    infinity: (ink) => [svg('path', { d: 'M50,50 C38,30 12,30 12,50 C12,70 38,70 50,50 C62,30 88,30 88,50 C88,70 62,70 50,50 Z', fill: 'none', stroke: ink, 'stroke-width': 9, 'stroke-linecap': 'round' })],
    paw: (ink) => [
      svg('ellipse', { cx: 50, cy: 66, rx: 24, ry: 19, fill: ink }),
      svg('circle', { cx: 24, cy: 40, r: 9, fill: ink }), svg('circle', { cx: 42, cy: 24, r: 9, fill: ink }),
      svg('circle', { cx: 60, cy: 24, r: 9, fill: ink }), svg('circle', { cx: 78, cy: 40, r: 9, fill: ink }),
    ],
    rose: (ink) => [
      svg('circle', { cx: 50, cy: 40, r: 26, fill: '#d6264a' }),
      svg('path', { d: 'M50,40 m-16,0 a16,16 0 1 1 32,0 a10,10 0 1 1 -20,0 a5,5 0 1 1 10,0', fill: 'none', stroke: '#7a0f28', 'stroke-width': 4 }),
      svg('path', { d: 'M50,66 L50,94', stroke: '#1f6f3a', 'stroke-width': 5, 'stroke-linecap': 'round' }),
      svg('ellipse', { cx: 36, cy: 78, rx: 12, ry: 6, fill: '#2f9e5a', transform: 'rotate(-30 36 78)' }),
      svg('ellipse', { cx: 64, cy: 84, rx: 12, ry: 6, fill: '#2f9e5a', transform: 'rotate(30 64 84)' }),
    ],
    arrow: (ink) => [
      svg('path', { d: 'M12,88 L84,16', stroke: ink, 'stroke-width': 6, 'stroke-linecap': 'round' }),
      svg('polygon', { points: '88,12 60,18 82,40', fill: ink }),
      svg('path', { d: 'M18,70 L8,88 L26,78 M28,60 L18,78 L36,68', stroke: ink, 'stroke-width': 5, 'stroke-linecap': 'round', fill: 'none' }),
    ],
    initials: (ink) => {
      const letters = pick('ABCDEFGHJKLMNPRSTVWZ'.split('')) + pick('ABCDEFGHJKLMNPRSTVWZ'.split(''));
      return [svg('text', { x: 50, y: 66, 'text-anchor': 'middle', 'font-size': 52, 'font-style': 'italic', 'font-weight': 700, 'font-family': '"Brush Script MT", "Segoe Script", cursive, Georgia, serif', fill: ink }, [letters])];
    },
    smiley: (ink) => [
      svg('circle', { cx: 50, cy: 50, r: 38, fill: 'none', stroke: ink, 'stroke-width': 8 }),
      svg('circle', { cx: 36, cy: 40, r: 6, fill: ink }), svg('circle', { cx: 64, cy: 40, r: 6, fill: ink }),
      svg('path', { d: 'M30,60 Q50,80 70,60', fill: 'none', stroke: ink, 'stroke-width': 7, 'stroke-linecap': 'round' }),
    ],
  };
  const HAND_TATTOOS = Object.keys(TATTOOS);
  const ARM_TATTOOS = HAND_TATTOOS.concat(['tribal', 'tribal']);

  /* ---------- random look ---------- */
  function randomLook(skinHex) {
    const skin = skinHex || pick(Settings.SKIN_TONES).hex;
    const look = { skin, rings: [], bracelets: [], watch: null, tattoo: null, nails: null, knuckles: null, freckles: chance(0.2) };

    // nails
    look.nails = chance(0.55) ? { kind: 'natural' } : { kind: 'polish', color: pick(POLISH), glitter: chance(0.3) };

    // rings: "randomly 1 or more of the same" - stacking allowed
    const ringRoll = Math.random();
    const ringCount = ringRoll < 0.28 ? 0 : ringRoll < 0.62 ? 1 : ringRoll < 0.84 ? 2 : ringRoll < 0.95 ? 3 : 4;
    const perFinger = {};
    for (let i = 0; i < ringCount; i++) {
      const finger = chance(0.1) ? 4 : randInt(0, 3); // 4 = thumb
      const stack = perFinger[finger] || 0;
      if (stack >= 2) continue;
      perFinger[finger] = stack + 1;
      look.rings.push({ finger, stack, metal: pick(Object.keys(METALS)), gem: chance(0.45) ? pick(GEMS) : null, wide: chance(0.3) });
    }

    // watch
    if (chance(0.5)) {
      const style = pick(['classic', 'sport', 'smart', 'metal']);
      look.watch = {
        style,
        metal: pick(['gold', 'silver', 'rose', 'black']),
        band: style === 'metal' ? 'links' : style === 'smart' ? pick(['silicone', 'nylon']) : style === 'sport' ? 'silicone' : pick(['leather', 'leather', 'nylon']),
        bandColor: pick(['#5a3a22', '#1d1d22', '#d84a6a', '#2d7dff', '#1fbf75', '#ff8a1f', '#7a3bd9', '#f2f2f2', '#0bd3ff']),
        face: pick(['#ffffff', '#101014', '#1b3f8f', '#0f5e3c', '#fff4d6']),
        hour: randInt(0, 11), minute: randInt(0, 59),
      };
    }

    // bracelets (several of the same kind is fine)
    const bRoll = Math.random();
    const bCount = bRoll < 0.4 ? 0 : bRoll < 0.7 ? 1 : bRoll < 0.88 ? 2 : 3;
    for (let i = 0; i < bCount; i++) {
      const kind = pick(['beads', 'beads', 'chain', 'cord', 'bangle', 'scrunchie']);
      look.bracelets.push({
        kind,
        metal: pick(['gold', 'silver', 'rose']),
        theme: pick(BEAD_THEMES),
        colors: [pick(POLISH), pick(POLISH)],
        charm: chance(0.4),
      });
    }

    // tattoo
    if (chance(0.5)) {
      const where = chance(0.55) ? 'hand' : 'arm';
      const design = where === 'hand' ? pick(HAND_TATTOOS) : pick(ARM_TATTOOS);
      look.tattoo = { where, design, ink: pick(INK), angle: rand(-14, 14) };
    }
    if (chance(0.12)) look.knuckles = { word: pick(KNUCKLE_WORDS), ink: pick(INK) };

    return look;
  }

  /* ---------- geometry ---------- */
  const FINGERS = [ // left to right: pinky, ring, middle, index
    { x: -33, len: 58 },
    { x: -11, len: 72 },
    { x: 11, len: 78 },
    { x: 33, len: 70 },
  ];
  const THUMB = { x: 42, y: 20, len: 90 };
  // pen grip point (between index and thumb) and where its tip lands, in hand coordinates
  const PEN = { x: 31, y: 120, rot: 34, tipLen: 60 };
  const PEN_TIP = [PEN.x - PEN.tipLen * Math.sin(PEN.rot * Math.PI / 180), PEN.y + PEN.tipLen * Math.cos(PEN.rot * Math.PI / 180)];
  const SLIP = { x: 24, y: 134, rot: -10 };

  const POSES = {
    open: { curl: [0.05, 0.03, 0.02, 0.04], thumb: -40 },
    relaxed: { curl: [0.22, 0.18, 0.15, 0.18], thumb: -30 },
    pinch: { curl: [0.78, 0.72, 0.62, 0.58], thumb: 6 },
    grab: { curl: [0.82, 0.84, 0.84, 0.82], thumb: 26 },
    spread: { curl: [0, 0, 0, 0], thumb: -52 },
  };

  let rigSeq = 0;

  function create(group, look) {
    const id = 'hand' + (++rigSeq);
    while (group.firstChild) group.removeChild(group.firstChild);

    const skin = look.skin;
    const outline = shade(skin, -0.32);
    const crease = shade(skin, -0.18);
    const hi = shade(skin, 0.28);

    // defs: metal gradients + skin gradient
    const defs = svg('defs');
    for (const m in METALS) {
      const g = svg('linearGradient', { id: `${id}-${m}`, x1: 0, y1: 0, x2: 0, y2: 1 });
      g.appendChild(svg('stop', { offset: 0, 'stop-color': METALS[m].a }));
      g.appendChild(svg('stop', { offset: 0.5, 'stop-color': METALS[m].b }));
      g.appendChild(svg('stop', { offset: 1, 'stop-color': METALS[m].c }));
      defs.appendChild(g);
    }
    const sg = svg('linearGradient', { id: `${id}-skin`, x1: 0, y1: 0, x2: 1, y2: 0 });
    sg.appendChild(svg('stop', { offset: 0, 'stop-color': shade(skin, -0.08) }));
    sg.appendChild(svg('stop', { offset: 0.45, 'stop-color': skin }));
    sg.appendChild(svg('stop', { offset: 1, 'stop-color': shade(skin, 0.1) }));
    defs.appendChild(sg);
    const scr = svg('linearGradient', { id: `${id}-screen`, x1: 0, y1: 0, x2: 1, y2: 1 });
    scr.appendChild(svg('stop', { offset: 0, 'stop-color': '#ff2d95' }));
    scr.appendChild(svg('stop', { offset: 0.5, 'stop-color': '#7d2ae8' }));
    scr.appendChild(svg('stop', { offset: 1, 'stop-color': '#00e5ff' }));
    defs.appendChild(scr);
    group.appendChild(defs);

    const root = svg('g', { class: 'hand-root' });
    group.appendChild(root);

    const metalFill = (m) => `url(#${id}-${m})`;
    const nailFill = look.nails.kind === 'polish' ? look.nails.color : shade(skin, 0.3);
    const nailStroke = look.nails.kind === 'polish' ? shade(look.nails.color, -0.35) : shade(skin, -0.22);

    // ---- held item slot (drawn under everything) ----
    const held = svg('g', { class: 'held' });
    root.appendChild(held);

    // ---- fingers ----
    const fingerBends = [];
    FINGERS.forEach((f, i) => {
      const fg = svg('g', { transform: `translate(${f.x},95)` });
      const bend = svg('g');
      bend.appendChild(svg('rect', { x: -10.5, y: -14, width: 21, height: f.len + 14, rx: 10.5, fill: `url(#${id}-skin)`, stroke: outline, 'stroke-width': 2.5 }));
      bend.appendChild(svg('path', { d: `M-7,${f.len * 0.42} Q0,${f.len * 0.42 + 3} 7,${f.len * 0.42}`, fill: 'none', stroke: crease, 'stroke-width': 1.6, opacity: 0.7 }));
      bend.appendChild(svg('path', { d: `M-7,${f.len * 0.7} Q0,${f.len * 0.7 + 3} 7,${f.len * 0.7}`, fill: 'none', stroke: crease, 'stroke-width': 1.6, opacity: 0.7 }));
      // nail
      bend.appendChild(svg('ellipse', { cx: 0, cy: f.len - 8, rx: 6.5, ry: 8, fill: nailFill, stroke: nailStroke, 'stroke-width': 1.2 }));
      bend.appendChild(svg('ellipse', { cx: -2, cy: f.len - 11, rx: 1.8, ry: 2.6, fill: '#fff', opacity: 0.55 }));
      if (look.nails.glitter) for (let k = 0; k < 3; k++) bend.appendChild(svg('circle', { cx: rand(-3, 3), cy: f.len - 8 + rand(-4, 4), r: 0.9, fill: '#fff' }));
      // knuckle word letter
      if (look.knuckles) {
        bend.appendChild(svg('text', { x: 0, y: 26, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, 'font-family': 'Georgia, serif', fill: look.knuckles.ink, opacity: 0.85 }, [look.knuckles.word[i]]));
      }
      // rings on this finger
      look.rings.filter((r) => r.finger === i).forEach((r) => {
        const y = 7 + r.stack * 11;
        const h = r.wide ? 10 : 7;
        bend.appendChild(svg('rect', { x: -12.5, y, width: 25, height: h, rx: 3, fill: metalFill(r.metal), stroke: METALS[r.metal].c, 'stroke-width': 1 }));
        if (r.gem) {
          bend.appendChild(svg('circle', { cx: 0, cy: y + h / 2, r: 4.6, fill: r.gem, stroke: METALS[r.metal].c, 'stroke-width': 1 }));
          bend.appendChild(svg('circle', { cx: -1.5, cy: y + h / 2 - 1.5, r: 1.3, fill: '#fff', opacity: 0.9 }));
        }
      });
      fg.appendChild(bend);
      root.appendChild(fg);
      fingerBends.push(bend);
    });

    // ---- thumb ----
    const thumbG = svg('g', { transform: `translate(${THUMB.x},${THUMB.y}) rotate(-40)` });
    thumbG.appendChild(svg('rect', { x: -11.5, y: -40, width: 23, height: THUMB.len + 40, rx: 11.5, fill: `url(#${id}-skin)`, stroke: outline, 'stroke-width': 2.5 }));
    thumbG.appendChild(svg('path', { d: `M-7,${THUMB.len * 0.55} Q0,${THUMB.len * 0.55 + 3} 7,${THUMB.len * 0.55}`, fill: 'none', stroke: crease, 'stroke-width': 1.6, opacity: 0.7 }));
    thumbG.appendChild(svg('ellipse', { cx: 0, cy: THUMB.len - 9, rx: 7, ry: 8.5, fill: nailFill, stroke: nailStroke, 'stroke-width': 1.2 }));
    thumbG.appendChild(svg('ellipse', { cx: -2, cy: THUMB.len - 12, rx: 1.8, ry: 2.6, fill: '#fff', opacity: 0.55 }));
    look.rings.filter((r) => r.finger === 4).forEach((r) => {
      const y = 36 + r.stack * 11;
      thumbG.appendChild(svg('rect', { x: -13.5, y, width: 27, height: 8, rx: 3, fill: metalFill(r.metal), stroke: METALS[r.metal].c, 'stroke-width': 1 }));
      if (r.gem) thumbG.appendChild(svg('circle', { cx: 0, cy: y + 4, r: 4.4, fill: r.gem, stroke: METALS[r.metal].c, 'stroke-width': 1 }));
    });
    root.appendChild(thumbG);

    // ---- silhouette: forearm + back of hand ----
    const body = svg('path', {
      d: 'M-41,-300 L-36,-6 C-50,30 -54,66 -47,96 Q-33,104 -22,95 Q-11,104 0,95 Q11,104 22,95 Q33,104 47,96 C54,66 50,30 36,-6 L41,-300 Z',
      fill: `url(#${id}-skin)`, stroke: outline, 'stroke-width': 2.5, 'stroke-linejoin': 'round',
    });
    root.appendChild(body);
    // soft highlight along the left edge, wrist crease, knuckle dimples
    root.appendChild(svg('path', { d: 'M-30,-290 L-27,-10 C-38,30 -42,66 -38,92', fill: 'none', stroke: hi, 'stroke-width': 5, opacity: 0.35, 'stroke-linecap': 'round' }));
    root.appendChild(svg('path', { d: 'M-30,2 Q0,8 30,2', fill: 'none', stroke: crease, 'stroke-width': 1.8, opacity: 0.6 }));
    FINGERS.forEach((f) => root.appendChild(svg('path', { d: `M${f.x - 6},88 Q${f.x},84 ${f.x + 6},88`, fill: 'none', stroke: crease, 'stroke-width': 1.8, opacity: 0.7 })));
    if (look.freckles) for (let k = 0; k < 9; k++) root.appendChild(svg('circle', { cx: rand(-30, 30), cy: rand(20, 80), r: rand(0.8, 1.6), fill: shade(skin, -0.3), opacity: 0.6 }));

    // ---- tattoo ----
    if (look.tattoo) {
      const t = look.tattoo;
      const tg = svg('g', { opacity: 0.82 });
      if (t.design === 'tribal') {
        const y = -118;
        tg.appendChild(svg('path', { d: `M-40,${y} L-30,${y - 9} L-20,${y + 9} L-10,${y - 9} L0,${y + 9} L10,${y - 9} L20,${y + 9} L30,${y - 9} L40,${y}`, fill: 'none', stroke: t.ink, 'stroke-width': 7, 'stroke-linejoin': 'round' }));
        tg.appendChild(svg('path', { d: `M-40,${y + 20} L40,${y + 20}`, stroke: t.ink, 'stroke-width': 4 }));
        tg.appendChild(svg('path', { d: `M-40,${y - 20} L40,${y - 20}`, stroke: t.ink, 'stroke-width': 4 }));
      } else {
        const cx = 0, cy = t.where === 'hand' ? 46 : -150, size = t.where === 'hand' ? 54 : 60;
        const inner = svg('g', { transform: `translate(${cx},${cy}) rotate(${t.angle}) scale(${size / 100}) translate(-50,-50)` });
        TATTOOS[t.design](t.ink).forEach((e) => inner.appendChild(e));
        tg.appendChild(inner);
      }
      root.appendChild(tg);
    }

    // ---- bracelets ----
    look.bracelets.forEach((b, i) => {
      const y = -22 - i * 13;
      const bg = svg('g');
      if (b.kind === 'beads') {
        for (let k = 0; k < 7; k++) {
          const x = -36 + k * 12;
          const yy = y + 2.5 * Math.cos((k / 6) * Math.PI);
          bg.appendChild(svg('circle', { cx: x, cy: yy, r: 5.6, fill: b.theme[k % b.theme.length], stroke: 'rgba(0,0,0,0.35)', 'stroke-width': 1 }));
          bg.appendChild(svg('circle', { cx: x - 1.8, cy: yy - 1.8, r: 1.4, fill: '#fff', opacity: 0.7 }));
        }
      } else if (b.kind === 'chain') {
        bg.appendChild(svg('path', { d: `M-39,${y} Q0,${y + 7} 39,${y}`, fill: 'none', stroke: METALS[b.metal].c, 'stroke-width': 5, 'stroke-linecap': 'round' }));
        bg.appendChild(svg('path', { d: `M-39,${y} Q0,${y + 7} 39,${y}`, fill: 'none', stroke: metalFill(b.metal), 'stroke-width': 3.5, 'stroke-dasharray': '5 3', 'stroke-linecap': 'round' }));
        if (b.charm) {
          bg.appendChild(svg('path', { d: `M0,${y + 14} C-6,${y + 9} -8,${y + 5} -5,${y + 3} C-3,${y + 1} 0,${y + 3} 0,${y + 5} C0,${y + 3} 3,${y + 1} 5,${y + 3} C8,${y + 5} 6,${y + 9} 0,${y + 14} Z`, fill: metalFill(b.metal), stroke: METALS[b.metal].c, 'stroke-width': 1 }));
        }
      } else if (b.kind === 'cord') {
        bg.appendChild(svg('path', { d: `M-39,${y} Q0,${y + 6} 39,${y}`, fill: 'none', stroke: b.colors[0], 'stroke-width': 6, 'stroke-linecap': 'round' }));
        bg.appendChild(svg('path', { d: `M-39,${y} Q0,${y + 6} 39,${y}`, fill: 'none', stroke: b.colors[1], 'stroke-width': 3, 'stroke-dasharray': '6 6' }));
      } else if (b.kind === 'bangle') {
        bg.appendChild(svg('path', { d: `M-40,${y} Q0,${y + 8} 40,${y}`, fill: 'none', stroke: METALS[b.metal].c, 'stroke-width': 9, 'stroke-linecap': 'round' }));
        bg.appendChild(svg('path', { d: `M-40,${y} Q0,${y + 8} 40,${y}`, fill: 'none', stroke: metalFill(b.metal), 'stroke-width': 7, 'stroke-linecap': 'round' }));
        bg.appendChild(svg('path', { d: `M-30,${y + 1} Q0,${y + 7} 30,${y + 1}`, fill: 'none', stroke: '#fff', 'stroke-width': 1.5, opacity: 0.6 }));
      } else { // scrunchie
        bg.appendChild(svg('path', { d: `M-40,${y} Q0,${y + 8} 40,${y}`, fill: 'none', stroke: shade(b.colors[0], -0.25), 'stroke-width': 13, 'stroke-linecap': 'round' }));
        bg.appendChild(svg('path', { d: `M-40,${y} Q0,${y + 8} 40,${y}`, fill: 'none', stroke: b.colors[0], 'stroke-width': 10, 'stroke-linecap': 'round', 'stroke-dasharray': '3 2' }));
      }
      root.appendChild(bg);
    });

    // ---- watch ----
    if (look.watch) {
      const w = look.watch;
      const wy = -74;
      const wg = svg('g');
      // band
      wg.appendChild(svg('rect', { x: -40, y: wy - 12, width: 80, height: 24, rx: 5, fill: w.band === 'links' ? METALS[w.metal].b : w.bandColor, stroke: 'rgba(0,0,0,0.35)', 'stroke-width': 1.2 }));
      if (w.band === 'links') for (let x = -34; x <= 34; x += 8) wg.appendChild(svg('line', { x1: x, y1: wy - 12, x2: x, y2: wy + 12, stroke: METALS[w.metal].c, 'stroke-width': 1.2, opacity: 0.8 }));
      if (w.band === 'nylon') for (let k = 0; k < 3; k++) wg.appendChild(svg('rect', { x: -40, y: wy - 9 + k * 7, width: 80, height: 3, fill: k === 1 ? '#fff' : shade(w.bandColor, -0.4), opacity: 0.7 }));
      if (w.band === 'leather') wg.appendChild(svg('path', { d: `M-37,${wy - 9} L37,${wy - 9} M-37,${wy + 9} L37,${wy + 9}`, stroke: shade(w.bandColor, 0.25), 'stroke-width': 1, 'stroke-dasharray': '3 2', opacity: 0.8 }));
      if (w.style === 'smart') {
        wg.appendChild(svg('rect', { x: -20, y: wy - 21, width: 40, height: 42, rx: 10, fill: METALS[w.metal].b, stroke: METALS[w.metal].c, 'stroke-width': 1.5 }));
        wg.appendChild(svg('rect', { x: -16, y: wy - 17, width: 32, height: 34, rx: 7, fill: '#0a0a10' }));
        wg.appendChild(svg('rect', { x: -14, y: wy - 15, width: 28, height: 30, rx: 6, fill: `url(#${id}-screen)`, opacity: 0.9 }));
        wg.appendChild(svg('text', { x: 0, y: wy + 4, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: '#fff', 'font-family': 'Arial, sans-serif' }, [`${w.hour || 12}:${String(w.minute).padStart(2, '0')}`]));
        wg.appendChild(svg('rect', { x: 20, y: wy - 6, width: 4, height: 12, rx: 1.5, fill: METALS[w.metal].c }));
      } else {
        wg.appendChild(svg('circle', { cx: 0, cy: wy, r: 22, fill: metalFill(w.metal), stroke: METALS[w.metal].c, 'stroke-width': 1.5 }));
        wg.appendChild(svg('circle', { cx: 0, cy: wy, r: 17, fill: w.face, stroke: METALS[w.metal].c, 'stroke-width': 1 }));
        const tickColor = w.face === '#101014' || w.face === '#1b3f8f' || w.face === '#0f5e3c' ? '#fff' : '#222';
        for (let k = 0; k < 12; k++) wg.appendChild(svg('line', { x1: 0, y1: wy - 15, x2: 0, y2: wy - (k % 3 === 0 ? 11 : 13), stroke: tickColor, 'stroke-width': k % 3 === 0 ? 2 : 1, transform: `rotate(${k * 30} 0 ${wy})` }));
        const ha = (w.hour % 12) * 30 + w.minute * 0.5, ma = w.minute * 6;
        wg.appendChild(svg('line', { x1: 0, y1: wy + 2, x2: 0, y2: wy - 8, stroke: tickColor, 'stroke-width': 2.5, 'stroke-linecap': 'round', transform: `rotate(${ha} 0 ${wy})` }));
        wg.appendChild(svg('line', { x1: 0, y1: wy + 2, x2: 0, y2: wy - 13, stroke: tickColor, 'stroke-width': 1.8, 'stroke-linecap': 'round', transform: `rotate(${ma} 0 ${wy})` }));
        wg.appendChild(svg('circle', { cx: 0, cy: wy, r: 1.8, fill: w.style === 'sport' ? '#ff3b30' : tickColor }));
        wg.appendChild(svg('rect', { x: 22, y: wy - 4, width: 5, height: 8, rx: 1.5, fill: METALS[w.metal].c }));
        wg.appendChild(svg('ellipse', { cx: -6, cy: wy - 8, rx: 6, ry: 3, fill: '#fff', opacity: 0.35, transform: `rotate(-30 -6 ${wy - 8})` }));
      }
      root.appendChild(wg);
    }

    // ---- rig API ----
    const rig = {
      group, root, look, held,
      pose: { x: 0, y: 0, rot: 0, scale: 1, curl: POSES.open.curl.slice(), thumb: POSES.open.thumb },
      heldKind: 'none',
      setPose(p) {
        Object.assign(this.pose, p);
        const P = this.pose;
        group.setAttribute('transform', `translate(${P.x.toFixed(2)},${P.y.toFixed(2)}) rotate(${P.rot.toFixed(2)}) scale(${P.scale})`);
        fingerBends.forEach((b, i) => {
          const c = U.clamp(P.curl[i], 0, 1);
          b.setAttribute('transform', `scale(1,${(1 - 0.6 * c).toFixed(3)})`);
        });
        thumbG.setAttribute('transform', `translate(${THUMB.x},${THUMB.y}) rotate(${P.thumb.toFixed(2)})`);
      },
      /** Tween to a new pose. Fields not given are kept. */
      moveTo(target, dur, easing) {
        const from = JSON.parse(JSON.stringify(this.pose));
        const to = Object.assign({}, from, target);
        if (target.curl) to.curl = target.curl.slice();
        return U.tween(dur, (t) => {
          this.setPose({
            x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t), rot: lerp(from.rot, to.rot, t), scale: lerp(from.scale, to.scale, t),
            curl: from.curl.map((c, i) => lerp(c, to.curl[i], t)), thumb: lerp(from.thumb, to.thumb, t),
          });
        }, easing);
      },
      /** What the hand is holding: 'none' | 'pen' | {slip: {label, number}} */
      hold(kind, opts) {
        while (held.firstChild) held.removeChild(held.firstChild);
        this.heldKind = kind;
        if (kind === 'pen') {
          const pg = svg('g', { transform: `translate(${PEN.x},${PEN.y}) rotate(${PEN.rot})` });
          pg.appendChild(svg('rect', { x: -4.5, y: -62, width: 9, height: 106, rx: 3.5, fill: '#2d7dff', stroke: '#133a80', 'stroke-width': 1.5 }));
          pg.appendChild(svg('rect', { x: -4.5, y: -62, width: 9, height: 14, rx: 3.5, fill: '#133a80' }));
          pg.appendChild(svg('polygon', { points: `-4.5,44 4.5,44 0,${PEN.tipLen}`, fill: '#f2d16b', stroke: '#8a6d1a', 'stroke-width': 1 }));
          pg.appendChild(svg('circle', { cx: 0, cy: PEN.tipLen - 1, r: 1.3, fill: '#111' }));
          held.appendChild(pg);
        } else if (kind === 'slip') {
          const o = opts || {};
          const sg = svg('g', { class: 'held-slip', transform: `translate(${SLIP.x},${SLIP.y}) rotate(${SLIP.rot})` });
          sg.appendChild(svg('rect', { x: -36, y: -12, width: 72, height: 50, rx: 3, fill: '#fffbe6', stroke: '#cdbb7a', 'stroke-width': 1.5 }));
          sg.appendChild(svg('line', { x1: -36, y1: 13, x2: 36, y2: 13, stroke: '#d9cb94', 'stroke-width': 1, 'stroke-dasharray': '3 2' }));
          if (o.label) {
            const fs = o.label.length <= 3 ? 26 : o.label.length <= 4 ? 23 : o.label.length <= 5 ? 20 : 17;
            sg.appendChild(svg('text', { x: 0, y: 13 + fs * 0.36, 'text-anchor': 'middle', 'font-size': fs, 'font-weight': 500, fill: '#1A140F', 'font-family': '"DM Mono", ui-monospace, Menlo, monospace' }, [o.label]));
          }
          held.appendChild(sg);
        }
      },
      recolor(skinHex) { look.skin = skinHex; return create(group, look); },
    };
    rig.setPose({});
    return rig;
  }

  window.Hand = { randomLook, create, POSES, FINGERS, THUMB, PEN_TIP, SLIP };
})();
