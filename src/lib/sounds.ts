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

/** ULTRA 10/10 LEGEND — brass horns + war drums + ascending triumph */
export function playEpicWin() {
  try {
    const a = ctx();
    const t = a.currentTime;

    // WAR DRUMS — deep booming hits
    [0, 0.25, 0.5].forEach((offset) => {
      const bufSize = a.sampleRate * 0.15;
      const buf = a.createBuffer(1, bufSize, a.sampleRate);
      const data = buf.getChannelData(0);
      for (let j = 0; j < bufSize; j++) {
        data[j] = Math.sin(2 * Math.PI * (80 - j * 0.003) * j / a.sampleRate) * Math.pow(1 - j / bufSize, 3);
      }
      const src = a.createBufferSource();
      src.buffer = buf;
      const g = a.createGain();
      g.gain.setValueAtTime(0.3, t + offset);
      g.gain.exponentialRampToValueAtTime(0.005, t + offset + 0.4);
      src.connect(g);
      g.connect(a.destination);
      src.start(t + offset);
      src.stop(t + offset + 0.4);
    });

    // BRASS HORNS — sawtooth + square harmony, 3 octaves ascending
    const hornStart = t + 0.15;
    const hornNotes = [196, 247, 294, 392, 494, 587, 784, 988, 1175, 1568, 1976, 2349];
    hornNotes.forEach((freq, i) => {
      const o = a.createOscillator();
      const o2 = a.createOscillator();
      const o3 = a.createOscillator();
      const g = a.createGain();
      o.type = "sawtooth";
      o2.type = "square";
      o3.type = "triangle";
      o.detune.value = Math.random() * 12 - 6;
      o2.detune.value = Math.random() * 8 - 4;
      o3.detune.value = 5;
      o.connect(g);
      o2.connect(g);
      o3.connect(g);
      g.connect(a.destination);
      const start = hornStart + i * 0.05;
      o.frequency.setValueAtTime(freq, start);
      o2.frequency.setValueAtTime(freq, start);
      o3.frequency.setValueAtTime(freq * 2, start);
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.07, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.005, start + 0.5);
      o.start(start);
      o2.start(start);
      o3.start(start);
      o.stop(start + 0.5);
      o2.stop(start + 0.5);
      o3.stop(start + 0.5);
    });

    // MASSIVE SUSTAINED POWER CHORD
    const chordStart = hornStart + hornNotes.length * 0.05;
    const powerChord = [392, 494, 587, 784, 988, 1175, 1568];
    powerChord.forEach((freq) => {
      ["sawtooth", "square", "sine"].forEach((type) => {
        const o = a.createOscillator();
        const g = a.createGain();
        o.type = type as OscillatorType;
        o.detune.value = Math.random() * 15 - 7.5;
        o.connect(g);
        g.connect(a.destination);
        o.frequency.setValueAtTime(freq, chordStart);
        g.gain.setValueAtTime(0, chordStart);
        g.gain.linearRampToValueAtTime(type === "sine" ? 0.06 : 0.03, chordStart + 0.08);
        g.gain.exponentialRampToValueAtTime(0.003, chordStart + 2.0);
        o.start(chordStart);
        o.stop(chordStart + 2.0);
      });
    });

    // VICTORY SPARKLE CASCADE
    const sparkleStart = chordStart + 0.4;
    [2637, 3136, 3520, 4186, 3520, 4186, 4699].forEach((freq, i) => {
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = "sine";
      o.connect(g);
      g.connect(a.destination);
      const s = sparkleStart + i * 0.1;
      o.frequency.setValueAtTime(freq, s);
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.12, s + 0.01);
      g.gain.exponentialRampToValueAtTime(0.003, s + 0.35);
      o.start(s);
      o.stop(s + 0.35);
    });

    // FINAL BOOM
    const boomStart = chordStart + 1.2;
    const boomBuf = a.createBuffer(1, a.sampleRate * 0.3, a.sampleRate);
    const boomData = boomBuf.getChannelData(0);
    for (let j = 0; j < boomBuf.length; j++) {
      boomData[j] = Math.sin(2 * Math.PI * 60 * j / a.sampleRate) * Math.pow(1 - j / boomBuf.length, 2) * 0.5;
    }
    const boomSrc = a.createBufferSource();
    boomSrc.buffer = boomBuf;
    const boomG = a.createGain();
    boomG.gain.setValueAtTime(0.25, boomStart);
    boomG.gain.exponentialRampToValueAtTime(0.005, boomStart + 0.5);
    boomSrc.connect(boomG);
    boomG.connect(a.destination);
    boomSrc.start(boomStart);
    boomSrc.stop(boomStart + 0.5);
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
