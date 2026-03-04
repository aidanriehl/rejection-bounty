const ctx = () => new (window.AudioContext || (window as any).webkitAudioContext)();

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

/** ULTRA 8/8 LEGEND — royal castle entrance, herald trumpets + celebration */
export function playEpicWin() {
  try {
    const a = ctx();
    const t = a.currentTime;

    // Bright brass stab helper — punchy, immediate, warm
    const trumpetStab = (freq: number, start: number, dur: number, vol: number) => {
      [1, 2, 3, 4, 5].forEach((h, i) => {
        const vols = [1, 0.7, 0.4, 0.25, 0.12];
        const o = a.createOscillator();
        const g = a.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(freq * h, start);
        o.detune.value = Math.random() * 4 - 2;
        o.connect(g);
        g.connect(a.destination);
        g.gain.setValueAtTime(0, start);
        // Quick attack — punchy, not slow
        g.gain.linearRampToValueAtTime(vol * vols[i], start + 0.015);
        g.gain.setValueAtTime(vol * vols[i], start + dur * 0.75);
        g.gain.exponentialRampToValueAtTime(0.001, start + dur);
        o.start(start);
        o.stop(start + dur);
      });
    };

    // HERALD FANFARE — bold, immediate, royal announcement
    // "BA-BA BA-BAAAA BA-BA BA-BAAAA" (classic royal herald)
    const f = t;
    trumpetStab(392, f, 0.12, 0.055);         // G4 — short
    trumpetStab(392, f + 0.14, 0.12, 0.055);  // G4 — short
    trumpetStab(523, f + 0.28, 0.12, 0.06);   // C5 — short
    trumpetStab(659, f + 0.42, 0.4, 0.065);   // E5 — HELD (the announcement!)

    trumpetStab(523, f + 0.9, 0.12, 0.055);   // C5 — short
    trumpetStab(659, f + 1.04, 0.12, 0.06);   // E5 — short
    trumpetStab(784, f + 1.18, 0.5, 0.065);   // G5 — HELD HIGH (triumph!)

    // SECOND TRUMPET — harmony, slightly delayed for richness
    trumpetStab(262, f + 0.01, 0.12, 0.035);
    trumpetStab(262, f + 0.15, 0.12, 0.035);
    trumpetStab(330, f + 0.29, 0.12, 0.04);
    trumpetStab(392, f + 0.43, 0.4, 0.045);
    trumpetStab(330, f + 0.91, 0.12, 0.035);
    trumpetStab(392, f + 1.05, 0.12, 0.04);
    trumpetStab(523, f + 1.19, 0.5, 0.045);

    // CELEBRATION CHORD — big, warm, joyful (the party!)
    const partyStart = f + 1.75;
    [262, 330, 392, 523, 659, 784, 1047].forEach((freq) => {
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
      g.connect(a.destination);
      g.gain.setValueAtTime(0, partyStart);
      g.gain.linearRampToValueAtTime(0.03, partyStart + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, partyStart + 1.2);
      o.start(partyStart);
      o2.start(partyStart);
      o.stop(partyStart + 1.2);
      o2.stop(partyStart + 1.2);
    });

    // SPARKLE RAIN — like confetti sounds, bright little pings
    const sparkleStart = f + 1.9;
    [2093, 2637, 3136, 2349, 3520, 2793, 4186].forEach((freq, i) => {
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = "sine";
      o.connect(g);
      g.connect(a.destination);
      const s = sparkleStart + i * 0.09;
      o.frequency.setValueAtTime(freq, s);
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.07, s + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, s + 0.2);
      o.start(s);
      o.stop(s + 0.2);
    });

    // BASS BOOM on the announcement hit
    const boomBuf = a.createBuffer(1, a.sampleRate * 0.25, a.sampleRate);
    const boomData = boomBuf.getChannelData(0);
    for (let j = 0; j < boomBuf.length; j++) {
      boomData[j] = Math.sin(2 * Math.PI * 55 * j / a.sampleRate) * Math.pow(1 - j / boomBuf.length, 2);
    }
    const boomSrc = a.createBufferSource();
    boomSrc.buffer = boomBuf;
    const bg = a.createGain();
    bg.gain.setValueAtTime(0.3, f + 0.42);
    bg.gain.exponentialRampToValueAtTime(0.005, f + 0.9);
    boomSrc.connect(bg);
    bg.connect(a.destination);
    boomSrc.start(f + 0.42);
    boomSrc.stop(f + 0.9);
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
