/* An upside-down ball cap. Origin = centre of the opening. The crown hangs below, the bill
   sticks out to the right. Hat.create(back, front, hex) fills two groups: `back` is drawn under
   the hand (the inside of the cap) and `front` over it (the crown + front rim + bill), so a hand
   placed between them looks like it is inside the hat. */
(function () {
  'use strict';
  const { svg, shade, rand, randInt } = U;
  let seq = 0;

  function create(back, front, hex) {
    const id = 'hat' + (++seq);
    while (back.firstChild) back.removeChild(back.firstChild);
    while (front.firstChild) front.removeChild(front.firstChild);

    const dark = shade(hex, -0.35);
    const darker = shade(hex, -0.55);
    const light = shade(hex, 0.18);
    const interior = shade(hex, -0.78);
    const isLight = (() => { const [r, g, b] = U.hexToRgb(hex); return (r * 0.299 + g * 0.587 + b * 0.114) > 190; })();
    const seam = isLight ? shade(hex, -0.25) : shade(hex, -0.3);

    // ---------- back (inside of the cap) ----------
    const defs = svg('defs');
    const ig = svg('radialGradient', { id: `${id}-in`, cx: '50%', cy: '70%', r: '70%' });
    ig.appendChild(svg('stop', { offset: 0, 'stop-color': '#120606' }));
    ig.appendChild(svg('stop', { offset: 0.7, 'stop-color': interior }));
    ig.appendChild(svg('stop', { offset: 1, 'stop-color': darker }));
    defs.appendChild(ig);
    const cg = svg('linearGradient', { id: `${id}-crown`, x1: 0, y1: 0, x2: 1, y2: 0.4 });
    cg.appendChild(svg('stop', { offset: 0, 'stop-color': light }));
    cg.appendChild(svg('stop', { offset: 0.45, 'stop-color': hex }));
    cg.appendChild(svg('stop', { offset: 1, 'stop-color': dark }));
    defs.appendChild(cg);
    const bg = svg('linearGradient', { id: `${id}-bill`, x1: 0, y1: 0, x2: 1, y2: 1 });
    bg.appendChild(svg('stop', { offset: 0, 'stop-color': hex }));
    bg.appendChild(svg('stop', { offset: 1, 'stop-color': darker }));
    defs.appendChild(bg);
    const clip = svg('clipPath', { id: `${id}-clip` });
    clip.appendChild(svg('ellipse', { cx: 0, cy: 0, rx: 92, ry: 27 }));
    defs.appendChild(clip);
    back.appendChild(defs);

    // back half of the rim (thick upper arc) and the interior
    back.appendChild(svg('path', { d: 'M-98,0 A98,32 0 0 1 98,0', fill: 'none', stroke: dark, 'stroke-width': 10, 'stroke-linecap': 'round' }));
    back.appendChild(svg('ellipse', { cx: 0, cy: 0, rx: 96, ry: 30, fill: `url(#${id}-in)` }));
    back.appendChild(svg('ellipse', { cx: 0, cy: -3, rx: 90, ry: 25, fill: 'none', stroke: shade(hex, -0.6), 'stroke-width': 2, opacity: 0.6 }));
    const slips = svg('g', { 'clip-path': `url(#${id}-clip)` });
    back.appendChild(slips);

    // ---------- front (crown, rim, bill) ----------
    const crown = svg('path', {
      d: 'M-96,0 A96,30 0 0 0 96,0 C100,60 72,134 0,138 C-72,134 -100,60 -96,0 Z',
      fill: `url(#${id}-crown)`, stroke: shade(hex, -0.45), 'stroke-width': 2.5, 'stroke-linejoin': 'round',
    });
    front.appendChild(crown);
    // panel seams
    front.appendChild(svg('path', { d: 'M-52,24 C-66,70 -48,118 -16,136', fill: 'none', stroke: seam, 'stroke-width': 2, opacity: 0.8 }));
    front.appendChild(svg('path', { d: 'M0,30 L0,138', fill: 'none', stroke: seam, 'stroke-width': 2, opacity: 0.8 }));
    front.appendChild(svg('path', { d: 'M52,24 C66,70 48,118 16,136', fill: 'none', stroke: seam, 'stroke-width': 2, opacity: 0.8 }));
    // stitching next to the seams
    front.appendChild(svg('path', { d: 'M-46,26 C-60,70 -43,116 -12,134 M46,26 C60,70 43,116 12,134', fill: 'none', stroke: light, 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: 0.7 }));
    // eyelets
    [[-28, 72], [28, 72]].forEach(([x, y]) => {
      front.appendChild(svg('circle', { cx: x, cy: y, r: 4.5, fill: darker, stroke: shade(hex, -0.6), 'stroke-width': 1 }));
      front.appendChild(svg('circle', { cx: x, cy: y, r: 2, fill: '#120606' }));
    });
    // highlight
    front.appendChild(svg('ellipse', { cx: -44, cy: 62, rx: 16, ry: 42, fill: '#fff', opacity: isLight ? 0.35 : 0.14, transform: 'rotate(12 -44 62)' }));
    // front rim (sweatband edge)
    front.appendChild(svg('path', { d: 'M-96,0 A96,30 0 0 0 96,0', fill: 'none', stroke: light, 'stroke-width': 9, 'stroke-linecap': 'round' }));
    front.appendChild(svg('path', { d: 'M-96,0 A96,30 0 0 0 96,0', fill: 'none', stroke: shade(hex, -0.45), 'stroke-width': 1.5, opacity: 0.6, transform: 'translate(0,4)' }));
    // button at the bottom
    front.appendChild(svg('circle', { cx: 0, cy: 138, r: 7.5, fill: dark, stroke: shade(hex, -0.6), 'stroke-width': 1.5 }));
    front.appendChild(svg('circle', { cx: -2, cy: 136, r: 2.2, fill: light, opacity: 0.8 }));
    // bill
    const bill = svg('g', { class: 'bill' });
    bill.appendChild(svg('path', {
      d: 'M66,16 C120,2 182,30 190,72 C194,98 160,108 124,100 C100,95 80,74 70,46 C67,36 66,26 66,16 Z',
      fill: `url(#${id}-bill)`, stroke: shade(hex, -0.5), 'stroke-width': 2.5, 'stroke-linejoin': 'round',
    }));
    bill.appendChild(svg('path', { d: 'M80,30 C124,20 166,42 176,74', fill: 'none', stroke: light, 'stroke-width': 1.5, 'stroke-dasharray': '4 3', opacity: 0.8 }));
    bill.appendChild(svg('path', { d: 'M92,66 C118,64 146,72 162,88', fill: 'none', stroke: shade(hex, -0.6), 'stroke-width': 2, opacity: 0.5 }));
    front.appendChild(bill);

    const slipEls = [];
    const api = {
      hex, slips, bill,
      /** Drop a slip into the hat (visible, poking up from the pile). */
      addSlip() {
        const x = rand(-62, 62), y = rand(-6, 12), r = rand(-50, 50);
        const g = svg('g', { transform: `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${r.toFixed(1)})` });
        g.appendChild(svg('rect', { x: -12, y: -8, width: 24, height: 16, rx: 2, fill: '#fffbe6', stroke: '#cdbb7a', 'stroke-width': 1.2 }));
        g.appendChild(svg('line', { x1: -12, y1: 0, x2: 12, y2: 0, stroke: '#d9cb94', 'stroke-width': 1 }));
        g.dataset.x = x; g.dataset.y = y; g.dataset.r = r;
        slips.appendChild(g);
        slipEls.push(g);
        if (slipEls.length > 26) { const old = slipEls.shift(); old.remove(); }
      },
      clearSlips() { slipEls.length = 0; while (slips.firstChild) slips.removeChild(slips.firstChild); },
      /** amount 0..1 : how violently the slips bounce (used while shaking) */
      jiggle(amount) {
        for (const g of slipEls) {
          const x = parseFloat(g.dataset.x), y = parseFloat(g.dataset.y), r = parseFloat(g.dataset.r);
          const dx = (Math.random() - 0.5) * 16 * amount, dy = (Math.random() - 0.5) * 16 * amount - 10 * amount;
          g.setAttribute('transform', `translate(${(x + dx).toFixed(1)},${(y + dy).toFixed(1)}) rotate(${(r + (Math.random() - 0.5) * 40 * amount).toFixed(1)})`);
        }
      },
      settle() { for (const g of slipEls) g.setAttribute('transform', `translate(${g.dataset.x},${g.dataset.y}) rotate(${g.dataset.r})`); },
      count: () => slipEls.length,
    };
    return api;
  }

  window.Hat = { create };
})();
