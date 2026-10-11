/* Settings: defaults, persistence, theme, and the static option lists. */
(function () {
  'use strict';

  const KEY = 'tiphat.settings.v1';

  const DEFAULT_AMOUNTS = [1, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 20, 23, 25, 28, 30, 35, 40, 45, 50, 55, 60, 67, 70, 80, 90, 100];

  const SKIN_TONES = [
    { id: 'porcelain', hex: '#FADCBC' },
    { id: 'fair', hex: '#F3C7A1' },
    { id: 'light', hex: '#E8B590' },
    { id: 'beige', hex: '#D9A077' },
    { id: 'tan', hex: '#C68642' },
    { id: 'olive', hex: '#B07A4B' },
    { id: 'bronze', hex: '#8D5524' },
    { id: 'brown', hex: '#6E4426' },
    { id: 'deep', hex: '#4E2E1E' },
    { id: 'ebony', hex: '#3B2419' },
  ];

  const HAT_COLORS = [
    { id: 'red', name: 'Red (classic)', hex: '#e0222e' },
    { id: 'blue', name: 'Royal Blue', hex: '#1e5bff' },
    { id: 'navy', name: 'Navy', hex: '#1b2a5c' },
    { id: 'black', name: 'Black', hex: '#2a2a30' },
    { id: 'green', name: 'Green', hex: '#1f9d4b' },
    { id: 'purple', name: 'Purple', hex: '#7d2ae8' },
    { id: 'pink', name: 'Hot Pink', hex: '#ff3fa4' },
    { id: 'orange', name: 'Orange', hex: '#ff7a1a' },
    { id: 'yellow', name: 'Yellow', hex: '#ffcf1b' },
    { id: 'teal', name: 'Teal', hex: '#13b5b1' },
    { id: 'maroon', name: 'Maroon', hex: '#7a1b2e' },
    { id: 'white', name: 'White', hex: '#f4f4f6' },
  ];

  const BACKGROUNDS = ['crowd', 'confetti', 'stars', 'fireworks'];

  const DEFAULTS = {
    theme: null,            // null = follow system until the user picks
    setSkin: false,         // false = random hand each session
    skinTone: 'tan',
    hatColor: 'red',
    amounts: DEFAULT_AMOUNTS.slice(),
    chooseAgain: 5,
    wild: 1,
    background: 'random',
    sound: true,
  };

  let state = load();

  function load() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { saved = null; }
    const s = Object.assign({}, DEFAULTS, saved || {});
    s.amounts = sanitizeAmounts(Array.isArray(s.amounts) ? s.amounts : DEFAULT_AMOUNTS);
    s.chooseAgain = U.clamp(parseInt(s.chooseAgain, 10) || 0, 0, 50);
    s.wild = U.clamp(parseInt(s.wild, 10) || 0, 0, 50);
    if (!HAT_COLORS.some((h) => h.id === s.hatColor)) s.hatColor = 'red';
    if (!SKIN_TONES.some((t) => t.id === s.skinTone)) s.skinTone = 'tan';
    if (s.background !== 'random' && !BACKGROUNDS.includes(s.background)) s.background = 'random';
    if (s.theme !== 'light' && s.theme !== 'dark') s.theme = null;
    return s;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode etc. */ }
  }

  function sanitizeAmounts(list) {
    const out = [];
    for (const v of list) {
      const n = Math.round(parseFloat(v) * 100) / 100;
      if (Number.isFinite(n) && n >= 0 && !out.includes(n)) out.push(n);
    }
    out.sort((a, b) => a - b);
    return out.length ? out : DEFAULT_AMOUNTS.slice();
  }

  function effectiveTheme() {
    if (state.theme) return state.theme;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme() {
    const t = effectiveTheme();
    document.documentElement.setAttribute('data-theme', t);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#1a0b2e' : '#ff2d95');
  }

  const Settings = {
    DEFAULT_AMOUNTS, SKIN_TONES, HAT_COLORS, BACKGROUNDS,
    get: () => state,
    set(patch) { Object.assign(state, patch); save(); },
    setAmounts(list) { state.amounts = sanitizeAmounts(list); save(); },
    resetAmounts() { state.amounts = DEFAULT_AMOUNTS.slice(); state.chooseAgain = DEFAULTS.chooseAgain; state.wild = DEFAULTS.wild; save(); },
    effectiveTheme, applyTheme,
    hatHex: () => (HAT_COLORS.find((h) => h.id === state.hatColor) || HAT_COLORS[0]).hex,
    skinHex: () => (SKIN_TONES.find((t) => t.id === state.skinTone) || SKIN_TONES[4]).hex,
    /** Total slips in the hat */
    slipCount: () => state.amounts.length + state.wild + state.chooseAgain,
    /** Build the full pool of slips: {kind:'money', value} | {kind:'wild'} | {kind:'again'} */
    buildPool() {
      const pool = state.amounts.map((v) => ({ kind: 'money', value: v }));
      for (let i = 0; i < state.wild; i++) pool.push({ kind: 'wild' });
      for (let i = 0; i < state.chooseAgain; i++) pool.push({ kind: 'again' });
      return pool;
    },
  };

  applyTheme();
  if (window.matchMedia) {
    try {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!state.theme) applyTheme(); });
    } catch (e) { /* older Safari */ }
  }

  window.Settings = Settings;
})();
