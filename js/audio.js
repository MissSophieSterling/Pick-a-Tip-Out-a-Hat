/* All sound is synthesised with the Web Audio API: scribbles, whooshes, rattles, a ticking clock,
   a Shepard tone for the suspense, and fanfares. Nothing to download. */
(function () {
  'use strict';

  let ctx = null, master = null, noise = null;
  let enabled = true;
  let shepard = null;
  let rummageTimer = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  function ready() { return enabled && ctx; }
  function now() { return ctx.currentTime; }

  function noiseBuffer() {
    if (noise) return noise;
    const len = ctx.sampleRate * 2;
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return noise;
  }

  /** Filtered noise burst. */
  function burst(o) {
    if (!ready()) return;
    const t = now() + (o.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer();
    src.loop = true;
    src.playbackRate.value = o.rate || 1;
    const f = ctx.createBiquadFilter();
    f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.freq || 1500, t);
    if (o.freqEnd) f.frequency.exponentialRampToValueAtTime(o.freqEnd, t + o.dur);
    f.Q.value = o.q || 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.gain || 0.3, t + (o.attack || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t, Math.random() * 1.5);
    src.stop(t + o.dur + 0.05);
  }

  /** Simple oscillator note. */
  function tone(o) {
    if (!ready()) return;
    const t = now() + (o.delay || 0);
    const osc = ctx.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.freqEnd) osc.frequency.exponentialRampToValueAtTime(o.freqEnd, t + (o.slide || o.dur));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.gain || 0.2, t + (o.attack || 0.01));
    if (o.sustain) g.gain.setValueAtTime(o.gain || 0.2, t + o.dur - (o.release || 0.1));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g); g.connect(master);
    osc.start(t);
    osc.stop(t + o.dur + 0.05);
  }

  const Audio = {
    get context() { return ctx; },
    get shepardRunning() { return !!shepard; },
    setEnabled(v) {
      enabled = !!v;
      if (!enabled) { Audio.stopShepard(); Audio.stopRummage(); }
    },
    isEnabled: () => enabled,
    /** Call from a user gesture so iOS lets us play. */
    unlock() { try { ensure(); } catch (e) { /* no audio */ } },

    pop() { tone({ freq: 620, freqEnd: 980, type: 'sine', dur: 0.09, gain: 0.18 }); },
    tap() { tone({ freq: 440, freqEnd: 660, type: 'triangle', dur: 0.07, gain: 0.12 }); },
    swoosh() { burst({ freq: 400, freqEnd: 2400, dur: 0.35, gain: 0.22, q: 0.8, attack: 0.08 }); },

    scribble() {
      if (!ready()) return;
      let d = 0;
      for (let i = 0; i < 5; i++) {
        burst({ freq: 2200 + Math.random() * 1500, q: 1.5, dur: 0.05 + Math.random() * 0.05, gain: 0.16, delay: d, type: 'bandpass' });
        d += 0.05 + Math.random() * 0.045;
      }
    },
    toss() {
      burst({ freq: 1600, freqEnd: 350, dur: 0.26, gain: 0.28, q: 1.2, attack: 0.02 });
      tone({ freq: 900, freqEnd: 300, type: 'sine', dur: 0.08, gain: 0.08 });
    },
    drop() { burst({ freq: 700, type: 'lowpass', dur: 0.09, gain: 0.2, attack: 0.005 }); },
    flurry() {
      for (let i = 0; i < 10; i++) burst({ freq: 1200 + Math.random() * 1200, freqEnd: 400, dur: 0.12, gain: 0.12, q: 1.2, delay: i * 0.055 });
    },
    rattle() {
      burst({ freq: 2600, type: 'highpass', dur: 0.07, gain: 0.16, attack: 0.004 });
      burst({ freq: 900, type: 'bandpass', q: 0.7, dur: 0.06, gain: 0.14, attack: 0.004, delay: 0.01 });
      tone({ freq: 140, freqEnd: 70, type: 'sine', dur: 0.09, gain: 0.22, attack: 0.004 });
    },
    startRummage() {
      if (!ready() || rummageTimer) return;
      const go = () => burst({ freq: 1500 + Math.random() * 1200, q: 1.3, dur: 0.1 + Math.random() * 0.12, gain: 0.08 + Math.random() * 0.08, attack: 0.03 });
      go();
      rummageTimer = setInterval(go, 110);
    },
    stopRummage() { if (rummageTimer) { clearInterval(rummageTimer); rummageTimer = null; } },

    tick(alt) {
      tone({ freq: alt ? 1250 : 1900, type: 'square', dur: 0.03, gain: 0.09, attack: 0.002 });
      burst({ freq: 4000, type: 'highpass', dur: 0.025, gain: 0.12, attack: 0.002 });
      tone({ freq: alt ? 320 : 420, type: 'sine', dur: 0.05, gain: 0.08, attack: 0.002 });
    },

    /** Endless rising Shepard tone. intensity() ramps the volume over the suspense. */
    startShepard() {
      if (!ready() || shepard) return;
      const N = 8, octaves = 8, fmin = 32.7; // C1 up through C9
      const bus = ctx.createGain();
      bus.gain.setValueAtTime(0.0001, now());
      bus.gain.linearRampToValueAtTime(0.35, now() + 1.2);
      const comp = ctx.createDynamicsCompressor();
      bus.connect(comp); comp.connect(master);
      const voices = [];
      for (let i = 0; i < N; i++) {
        const o = ctx.createOscillator();
        o.type = 'sine';
        const g = ctx.createGain();
        g.gain.value = 0;
        o.connect(g); g.connect(bus);
        o.start();
        voices.push({ o, g });
      }
      const period = 18; // seconds for one voice to sweep the whole range: one octave every ~2.2 s
      const t0 = now();
      const timer = setInterval(() => {
        const t = now() - t0;
        const c = now();
        for (let i = 0; i < N; i++) {
          const x = ((t / period) + i / N) % 1;
          const f = fmin * Math.pow(2, x * octaves);
          const a = Math.pow(Math.sin(Math.PI * x), 2) * 0.16;
          voices[i].o.frequency.setTargetAtTime(f, c, 0.03);
          voices[i].g.gain.setTargetAtTime(a, c, 0.03);
        }
      }, 40);
      shepard = { bus, voices, timer, comp };
    },
    shepardIntensity(v) {
      if (!shepard) return;
      shepard.bus.gain.setTargetAtTime(0.3 + 0.55 * U.clamp(v, 0, 1), now(), 0.2);
    },
    stopShepard() {
      if (!shepard) return;
      const s = shepard; shepard = null;
      clearInterval(s.timer);
      s.bus.gain.setTargetAtTime(0.0001, now(), 0.05);
      setTimeout(() => { s.voices.forEach((v) => { try { v.o.stop(); } catch (e) { /* already */ } }); s.comp.disconnect(); }, 400);
    },

    fanfare() {
      if (!ready()) return;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, i) => {
        tone({ freq: f, type: 'square', dur: 0.32, gain: 0.08, delay: i * 0.11 });
        tone({ freq: f, type: 'triangle', dur: 0.4, gain: 0.16, delay: i * 0.11 });
      });
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f) => {
        tone({ freq: f, type: 'sawtooth', dur: 1.6, gain: 0.05, delay: 0.5, attack: 0.05, sustain: true, release: 0.6 });
        tone({ freq: f, type: 'triangle', dur: 1.6, gain: 0.1, delay: 0.5, attack: 0.05, sustain: true, release: 0.6 });
      });
      burst({ freq: 5000, type: 'highpass', dur: 1.2, gain: 0.08, attack: 0.3, delay: 0.5 });
    },
    sparkle() {
      if (!ready()) return;
      const scale = [1046.5, 1174.7, 1318.5, 1568, 1760, 2093, 2349, 2637];
      for (let i = 0; i < 9; i++) tone({ freq: scale[Math.min(scale.length - 1, i)], type: 'sine', dur: 0.35, gain: 0.14, delay: i * 0.07 });
      burst({ freq: 6000, type: 'highpass', dur: 0.9, gain: 0.07, attack: 0.2 });
    },
    twinkle() {
      if (!ready()) return;
      [1568, 2093, 2637, 3136].forEach((f, i) => tone({ freq: f, type: 'sine', dur: 0.3, gain: 0.11, delay: i * 0.06 }));
      burst({ freq: 7000, type: 'highpass', dur: 0.45, gain: 0.05, attack: 0.05 });
    },
    boing() {
      tone({ freq: 520, freqEnd: 240, type: 'triangle', dur: 0.12, slide: 0.1, gain: 0.22 });
      tone({ freq: 240, freqEnd: 820, type: 'triangle', dur: 0.32, slide: 0.3, gain: 0.22, delay: 0.12 });
    },
    crowdRoar(dur) {
      if (!ready()) return;
      dur = dur || 4;
      burst({ freq: 900, q: 0.5, dur, gain: 0.3, attack: 0.5 });
      burst({ freq: 350, type: 'lowpass', dur, gain: 0.25, attack: 0.5 });
      for (let i = 0; i < 14; i++) {
        const d = Math.random() * (dur - 0.6);
        tone({ freq: 1800 + Math.random() * 1400, freqEnd: 2600 + Math.random() * 1200, type: 'sine', dur: 0.35, gain: 0.03, delay: d });
      }
      for (let i = 0; i < 60; i++) burst({ freq: 2500 + Math.random() * 2000, q: 2, dur: 0.03, gain: 0.05, delay: Math.random() * dur, attack: 0.003 });
    },
    /** A small crowd of kids shouting "yaaay", with clapping. Synthesised: sawtooth voices through two sweeping formant filters. */
    kidsYay() {
      if (!ready()) return;
      const t0 = now();
      for (let v = 0; v < 8; v++) {
        const f0 = 260 + Math.random() * 300;
        const d = Math.random() * 0.14;
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f0 * 0.9, t0 + d);
        osc.frequency.linearRampToValueAtTime(f0 * 1.25, t0 + d + 0.35);
        osc.frequency.linearRampToValueAtTime(f0 * 1.05, t0 + d + 1.1);
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 5.5 + Math.random() * 1.5;
        const lfoG = ctx.createGain();
        lfoG.gain.value = f0 * 0.03;
        lfo.connect(lfoG); lfoG.connect(osc.frequency);
        const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 5;
        f1.frequency.setValueAtTime(750, t0 + d); f1.frequency.linearRampToValueAtTime(450, t0 + d + 1.0);
        const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.Q.value = 6;
        f2.frequency.setValueAtTime(1300, t0 + d); f2.frequency.linearRampToValueAtTime(2300, t0 + d + 1.0);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0 + d);
        g.gain.linearRampToValueAtTime(0.09, t0 + d + 0.08);
        g.gain.setValueAtTime(0.09, t0 + d + 0.9);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 1.35);
        osc.connect(f1); osc.connect(f2); f1.connect(g); f2.connect(g); g.connect(master);
        lfo.start(t0 + d); lfo.stop(t0 + d + 1.4);
        osc.start(t0 + d); osc.stop(t0 + d + 1.4);
      }
      burst({ freq: 1800, q: 0.6, dur: 1.8, gain: 0.12, attack: 0.3 });
      for (let i = 0; i < 28; i++) burst({ freq: 2500 + Math.random() * 2000, q: 2, dur: 0.03, gain: 0.05, delay: 0.2 + Math.random() * 1.5, attack: 0.003 });
    },
    boom() {
      tone({ freq: 90, freqEnd: 35, type: 'sine', dur: 0.5, gain: 0.35, attack: 0.005 });
      burst({ freq: 300, type: 'lowpass', dur: 0.4, gain: 0.25, attack: 0.005 });
    },
    whistleUp() { tone({ freq: 400, freqEnd: 1800, type: 'sine', dur: 0.9, slide: 0.9, gain: 0.05, attack: 0.05 }); },
    crackle() { for (let i = 0; i < 6; i++) burst({ freq: 3000 + Math.random() * 3000, q: 3, dur: 0.03, gain: 0.08, delay: Math.random() * 0.4, attack: 0.002 }); },
  };

  window.Sfx = Audio;
})();
