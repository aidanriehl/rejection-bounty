// Shared AudioContext for all sounds - iOS requires a single context resumed on user interaction
let sharedContext: AudioContext | null = null;

function getContext(): AudioContext {
  if (!sharedContext) {
    sharedContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume if suspended (iOS requirement)
  if (sharedContext.state === "suspended") {
    sharedContext.resume();
  }
  return sharedContext;
}

const ctx = getContext;

/** Single task — rising arpeggio + chord (was bigWin) */
export function playPop() {
  try {
    const a = ctx();
    const t = a.currentTime;
    const arp = [523, 659, 784, 1047, 1319, 1568];
    arp.forEach((freq, i) => {
      const o = a.createOscillator();
      const o2 = a.createOscillator();
      const g = a.createGain();
      o.type = "sine";
      o2.type = "triangle";
      o2.detune.value = 7;
      o.connect(g);
      o2.connect(g);
      g.connect(a.destination);
      const start = t + i * 0.08;
      o.frequency.setValueAtTime(freq, start);
      o2.frequency.setValueAtTime(freq * 1.5, start);
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.14, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.01, start + 0.35);
      o.start(start);
      o2.start(start);
      o.stop(start + 0.35);
      o2.stop(start + 0.35);
    });

    const chord = [523, 659, 784];
    const chordStart = t + arp.length * 0.08;
    chord.forEach((freq) => {
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = "sine";
      o.detune.value = Math.random() * 6 - 3;
      o.connect(g);
      g.connect(a.destination);
      o.frequency.setValueAtTime(freq, chordStart);
      g.gain.setValueAtTime(0, chordStart);
      g.gain.linearRampToValueAtTime(0.1, chordStart + 0.05);
      g.gain.exponentialRampToValueAtTime(0.005, chordStart + 0.6);
      o.start(chordStart);
      o.stop(chordStart + 0.6);
    });
  } catch {}
}

/** 5/10 Goal reached — dramatic two-octave fanfare + shimmer chord (was epicWin) */
export function playBigWin() {
  try {
    const a = ctx();
    const t = a.currentTime;

    const arp = [262, 330, 392, 523, 659, 784, 1047, 1319, 1568, 2093];
    arp.forEach((freq, i) => {
      const o = a.createOscillator();
      const o2 = a.createOscillator();
      const g = a.createGain();
      o.type = "sine";
      o2.type = "triangle";
      o2.detune.value = 8;
      o.connect(g);
      o2.connect(g);
      g.connect(a.destination);
      const start = t + i * 0.06;
      o.frequency.setValueAtTime(freq, start);
      o2.frequency.setValueAtTime(freq * 1.5, start);
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.16, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.01, start + 0.4);
      o.start(start);
      o2.start(start);
      o.stop(start + 0.4);
      o2.stop(start + 0.4);
    });

    const chordStart = t + arp.length * 0.06;
    const chordNotes = [523, 659, 784, 1047, 1319];
    chordNotes.forEach((freq) => {
      const o = a.createOscillator();
      const o2 = a.createOscillator();
      const g = a.createGain();
      o.type = "sine";
      o2.type = "sawtooth";
      o.detune.value = Math.random() * 10 - 5;
      o2.detune.value = Math.random() * 10 - 5;
      o.connect(g);
      o2.connect(g);
      g.connect(a.destination);
      o.frequency.setValueAtTime(freq, chordStart);
      o2.frequency.setValueAtTime(freq, chordStart);
      g.gain.setValueAtTime(0, chordStart);
      g.gain.linearRampToValueAtTime(0.08, chordStart + 0.05);
      g.gain.exponentialRampToValueAtTime(0.005, chordStart + 1.2);
      o.start(chordStart);
      o2.start(chordStart);
      o.stop(chordStart + 1.2);
      o2.stop(chordStart + 1.2);
    });

    const sparkleStart = chordStart + 0.3;
    [2637, 3136, 3520].forEach((freq, i) => {
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = "sine";
      o.connect(g);
      g.connect(a.destination);
      const s = sparkleStart + i * 0.12;
      o.frequency.setValueAtTime(freq, s);
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.1, s + 0.01);
      g.gain.exponentialRampToValueAtTime(0.005, s + 0.3);
      o.start(s);
      o.stop(s + 0.3);
    });
  } catch {}
}

/** ULTRA 8/8 LEGEND — MASSIVE royal fanfare + timpani + celebration */
export function playEpicWin() {
  try {
    const a = ctx();
    const t = a.currentTime;

    // Master compressor for loudness
    const comp = a.createDynamicsCompressor();
    comp.threshold.setValueAtTime(-10, t);
    comp.knee.setValueAtTime(10, t);
    comp.ratio.setValueAtTime(4, t);
    comp.attack.setValueAtTime(0.003, t);
    comp.release.setValueAtTime(0.1, t);
    
    const masterGain = a.createGain();
    masterGain.gain.setValueAtTime(1.8, t);
    masterGain.connect(comp);
    comp.connect(a.destination);

    // Bright brass stab helper — punchy, immediate, warm
    const trumpetStab = (freq: number, start: number, dur: number, vol: number) => {
      [1, 2, 3, 4, 5, 6].forEach((h, i) => {
        const vols = [1, 0.7, 0.5, 0.35, 0.2, 0.1];
        const o = a.createOscillator();
        const g = a.createGain();
        o.type = i < 3 ? "sine" : "sawtooth";
        o.frequency.setValueAtTime(freq * h, start);
        o.detune.value = Math.random() * 6 - 3;
        o.connect(g);
        g.connect(masterGain);
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(vol * vols[i], start + 0.012);
        g.gain.setValueAtTime(vol * vols[i], start + dur * 0.75);
        g.gain.exponentialRampToValueAtTime(0.001, start + dur);
        o.start(start);
        o.stop(start + dur);
      });
    };

    // TIMPANI ROLL — dramatic buildup
    const timpaniHit = (start: number, vol: number) => {
      const buf = a.createBuffer(1, a.sampleRate * 0.4, a.sampleRate);
      const data = buf.getChannelData(0);
      for (let j = 0; j < buf.length; j++) {
        const env = Math.pow(1 - j / buf.length, 1.5);
        data[j] = Math.sin(2 * Math.PI * 80 * j / a.sampleRate) * env +
                   Math.sin(2 * Math.PI * 120 * j / a.sampleRate) * env * 0.5 +
                   (Math.random() * 2 - 1) * env * 0.08;
      }
      const src = a.createBufferSource();
      src.buffer = buf;
      const g = a.createGain();
      g.gain.setValueAtTime(vol, start);
      src.connect(g);
      g.connect(masterGain);
      src.start(start);
      src.stop(start + 0.4);
    };

    // Timpani hits before fanfare
    timpaniHit(t, 0.5);
    timpaniHit(t + 0.15, 0.6);
    timpaniHit(t + 0.25, 0.7);

    // HERALD FANFARE — bold, immediate, royal announcement
    const f = t + 0.35;
    trumpetStab(392, f, 0.12, 0.09);
    trumpetStab(392, f + 0.14, 0.12, 0.09);
    trumpetStab(523, f + 0.28, 0.12, 0.10);
    trumpetStab(659, f + 0.42, 0.4, 0.11);

    trumpetStab(523, f + 0.9, 0.12, 0.09);
    trumpetStab(659, f + 1.04, 0.12, 0.10);
    trumpetStab(784, f + 1.18, 0.5, 0.11);

    // SECOND TRUMPET — harmony
    trumpetStab(262, f + 0.01, 0.12, 0.06);
    trumpetStab(262, f + 0.15, 0.12, 0.06);
    trumpetStab(330, f + 0.29, 0.12, 0.07);
    trumpetStab(392, f + 0.43, 0.4, 0.075);
    trumpetStab(330, f + 0.91, 0.12, 0.06);
    trumpetStab(392, f + 1.05, 0.12, 0.07);
    trumpetStab(523, f + 1.19, 0.5, 0.075);

    // THIRD TRUMPET — low power octave for grandeur
    trumpetStab(196, f + 0.02, 0.12, 0.05);
    trumpetStab(196, f + 0.16, 0.12, 0.05);
    trumpetStab(262, f + 0.30, 0.12, 0.055);
    trumpetStab(330, f + 0.44, 0.4, 0.06);
    trumpetStab(262, f + 0.92, 0.12, 0.05);
    trumpetStab(330, f + 1.06, 0.12, 0.055);
    trumpetStab(392, f + 1.20, 0.5, 0.06);

    // BASS BOOM on the announcement hit
    timpaniHit(f + 0.42, 0.8);
    timpaniHit(f + 1.18, 0.9);

    // CYMBAL CRASH
    const crashStart = f + 1.18;
    const crashBuf = a.createBuffer(1, a.sampleRate * 1.5, a.sampleRate);
    const crashData = crashBuf.getChannelData(0);
    for (let j = 0; j < crashBuf.length; j++) {
      crashData[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / crashBuf.length, 1.2);
    }
    const crashSrc = a.createBufferSource();
    crashSrc.buffer = crashBuf;
    const crashFilter = a.createBiquadFilter();
    crashFilter.type = "highpass";
    crashFilter.frequency.value = 3000;
    const crashGain = a.createGain();
    crashGain.gain.setValueAtTime(0.25, crashStart);
    crashGain.gain.exponentialRampToValueAtTime(0.005, crashStart + 1.5);
    crashSrc.connect(crashFilter);
    crashFilter.connect(crashGain);
    crashGain.connect(masterGain);
    crashSrc.start(crashStart);
    crashSrc.stop(crashStart + 1.5);

    // CELEBRATION CHORD — massive, warm, joyful
    const partyStart = f + 1.75;
    [131, 196, 262, 330, 392, 523, 659, 784, 1047, 1319].forEach((freq) => {
      const o = a.createOscillator();
      const o2 = a.createOscillator();
      const g = a.createGain();
      o.type = "sine";
      o2.type = "sine";
      o2.detune.value = 6;
      o.frequency.setValueAtTime(freq, partyStart);
      o2.frequency.setValueAtTime(freq, partyStart);
      o.connect(g);
      o2.connect(g);
      g.connect(masterGain);
      g.gain.setValueAtTime(0, partyStart);
      g.gain.linearRampToValueAtTime(0.06, partyStart + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, partyStart + 1.5);
      o.start(partyStart);
      o2.start(partyStart);
      o.stop(partyStart + 1.5);
      o2.stop(partyStart + 1.5);
    });

    // SPARKLE RAIN — bright celebration pings
    const sparkleStart = f + 1.9;
    [2093, 2637, 3136, 2349, 3520, 2793, 4186, 3520, 2637, 4186].forEach((freq, i) => {
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = "sine";
      o.connect(g);
      g.connect(masterGain);
      const s = sparkleStart + i * 0.07;
      o.frequency.setValueAtTime(freq, s);
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.12, s + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, s + 0.25);
      o.start(s);
      o.stop(s + 0.25);
    });

    // FINAL TRIUMPHANT CHORD
    const finalStart = f + 2.5;
    [262, 330, 392, 523, 784, 1047].forEach((freq) => {
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = "sine";
      o.connect(g);
      g.connect(masterGain);
      o.frequency.setValueAtTime(freq, finalStart);
      g.gain.setValueAtTime(0, finalStart);
      g.gain.linearRampToValueAtTime(0.05, finalStart + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, finalStart + 1.8);
      o.start(finalStart);
      o.stop(finalStart + 1.8);
    });
  } catch {}
}
/** Short cheerful success ding — for completing the tour */
export function playSuccessDing() {
  try {
    const a = ctx();
    const t = a.currentTime;

    // Two-note rising chime (G5 → C6)
    [784, 1047].forEach((freq, i) => {
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(freq, t + i * 0.12);
      o.connect(g);
      g.connect(a.destination);
      g.gain.setValueAtTime(0, t + i * 0.12);
      g.gain.linearRampToValueAtTime(0.18, t + i * 0.12 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.005, t + i * 0.12 + 0.4);
      o.start(t + i * 0.12);
      o.stop(t + i * 0.12 + 0.4);
    });

    // Sparkle overlay
    const o2 = a.createOscillator();
    const g2 = a.createGain();
    o2.type = "triangle";
    o2.frequency.setValueAtTime(2093, t + 0.24);
    o2.connect(g2);
    g2.connect(a.destination);
    g2.gain.setValueAtTime(0, t + 0.24);
    g2.gain.linearRampToValueAtTime(0.08, t + 0.25);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o2.start(t + 0.24);
    o2.stop(t + 0.5);
  } catch {}
}

/** Slot machine reel tick — light playful click */
export function playReelTick() {
  try {
    const a = ctx();
    const t = a.currentTime;

    // Higher-pitched, lighter knock
    const osc = a.createOscillator();
    const oscGain = a.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.025);
    oscGain.gain.setValueAtTime(0.15, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    osc.connect(oscGain);
    oscGain.connect(a.destination);
    osc.start(t);
    osc.stop(t + 0.03);

    // Short bright noise tap
    const bufSize = a.sampleRate * 0.008;
    const buf = a.createBuffer(1, bufSize, a.sampleRate);
    const data = buf.getChannelData(0);
    for (let j = 0; j < bufSize; j++) {
      data[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / bufSize, 12);
    }
    const src = a.createBufferSource();
    src.buffer = buf;
    const bp = a.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 3000;
    bp.Q.value = 2;
    const g = a.createGain();
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.015);
    src.connect(bp);
    bp.connect(g);
    g.connect(a.destination);
    src.start(t);
    src.stop(t + 0.015);
  } catch {}
}

/** Cascade / pieces clicking into place */
export function playCascade(count = 10, durationMs = 800) {
  try {
    const a = ctx();
    const t = a.currentTime;
    const interval = (durationMs / 1000) / count;

    for (let i = 0; i < count; i++) {
      const start = t + i * interval;
      const bufSize = a.sampleRate * 0.03;
      const buf = a.createBuffer(1, bufSize, a.sampleRate);
      const data = buf.getChannelData(0);
      for (let j = 0; j < bufSize; j++) {
        data[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / bufSize, 8);
      }
      const src = a.createBufferSource();
      src.buffer = buf;

      const bp = a.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 2000 + i * 200;
      bp.Q.value = 5;

      const g = a.createGain();
      g.gain.setValueAtTime(0.25, start);
      g.gain.exponentialRampToValueAtTime(0.005, start + 0.06);

      src.connect(bp);
      bp.connect(g);
      g.connect(a.destination);
      src.start(start);
      src.stop(start + 0.06);
    }
  } catch {}
}

/** Satisfying heavy "thud" — deep impact + crunch, pitched slightly by index */
export function playBrickLand(index: number) {
  try {
    const a = ctx();
    const t = a.currentTime;

    // Heavy sub-bass impact — deep and punchy
    const subOsc = a.createOscillator();
    const subGain = a.createGain();
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(60 + index * 3, t);
    subOsc.frequency.exponentialRampToValueAtTime(25, t + 0.2);
    subGain.gain.setValueAtTime(0.5, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    subOsc.connect(subGain);
    subGain.connect(a.destination);
    subOsc.start(t);
    subOsc.stop(t + 0.2);

    // Gritty impact noise — short burst, low-pass filtered for weight
    const bufSize = a.sampleRate * 0.06;
    const buf = a.createBuffer(1, bufSize, a.sampleRate);
    const data = buf.getChannelData(0);
    for (let j = 0; j < bufSize; j++) {
      data[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / bufSize, 4);
    }
    const src = a.createBufferSource();
    src.buffer = buf;
    const lp = a.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 600 + index * 40;
    lp.Q.value = 2;
    const impactGain = a.createGain();
    impactGain.gain.setValueAtTime(0.4, t);
    impactGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    src.connect(lp);
    lp.connect(impactGain);
    impactGain.connect(a.destination);
    src.start(t);
    src.stop(t + 0.08);

    // Secondary low rumble for weight
    const rumbleOsc = a.createOscillator();
    const rumbleGain = a.createGain();
    rumbleOsc.type = "triangle";
    rumbleOsc.frequency.setValueAtTime(45 + index * 2, t);
    rumbleOsc.frequency.exponentialRampToValueAtTime(20, t + 0.12);
    rumbleGain.gain.setValueAtTime(0.2, t + 0.01);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    rumbleOsc.connect(rumbleGain);
    rumbleGain.connect(a.destination);
    rumbleOsc.start(t);
    rumbleOsc.stop(t + 0.12);

    if (navigator.vibrate) navigator.vibrate(30);
  } catch {}
}
