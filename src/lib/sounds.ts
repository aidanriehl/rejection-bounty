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

/** ULTRA 8/8 LEGEND — royal fanfare, prince's arrival */
export function playEpicWin() {
  try {
    const a = ctx();
    const t = a.currentTime;

    // ROYAL TIMPANI — deep regal drum hits
    [0, 0.3, 0.6].forEach((offset) => {
      const bufSize = a.sampleRate * 0.2;
      const buf = a.createBuffer(1, bufSize, a.sampleRate);
      const data = buf.getChannelData(0);
      for (let j = 0; j < bufSize; j++) {
        data[j] = Math.sin(2 * Math.PI * (90 - j * 0.002) * j / a.sampleRate) * Math.pow(1 - j / bufSize, 2.5);
      }
      const src = a.createBufferSource();
      src.buffer = buf;
      const g = a.createGain();
      g.gain.setValueAtTime(0.25, t + offset);
      g.gain.exponentialRampToValueAtTime(0.005, t + offset + 0.5);
      src.connect(g);
      g.connect(a.destination);
      src.start(t + offset);
      src.stop(t + offset + 0.5);
    });

    // TRUMPET FANFARE — Da-da-da-DAAAA pattern (royal herald)
    const fanfareStart = t + 0.1;
    const fanfare = [
      { freq: 392, dur: 0.15, delay: 0 },      // G4 short
      { freq: 392, dur: 0.15, delay: 0.18 },    // G4 short
      { freq: 392, dur: 0.15, delay: 0.36 },    // G4 short
      { freq: 523, dur: 0.6, delay: 0.54 },     // C5 LONG (the royal note)
      { freq: 440, dur: 0.15, delay: 1.2 },     // A4 pickup
      { freq: 523, dur: 0.15, delay: 1.38 },    // C5 pickup
      { freq: 659, dur: 0.8, delay: 1.56 },     // E5 LONG (triumphant resolution)
    ];
    fanfare.forEach(({ freq, dur, delay }) => {
      const o = a.createOscillator();
      const o2 = a.createOscillator();
      const o3 = a.createOscillator();
      const g = a.createGain();
      o.type = "sawtooth";
      o2.type = "square";
      o3.type = "triangle";
      o.detune.value = 5;
      o2.detune.value = -5;
      o.connect(g);
      o2.connect(g);
      o3.connect(g);
      g.connect(a.destination);
      const s = fanfareStart + delay;
      o.frequency.setValueAtTime(freq, s);
      o2.frequency.setValueAtTime(freq, s);
      o3.frequency.setValueAtTime(freq * 2, s);
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.06, s + 0.02);
      g.gain.setValueAtTime(0.06, s + dur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.003, s + dur);
      o.start(s);
      o2.start(s);
      o3.start(s);
      o.stop(s + dur);
      o2.stop(s + dur);
      o3.stop(s + dur);
    });

    // MAJESTIC SUSTAINED CHORD after fanfare
    const chordStart = fanfareStart + 2.4;
    const majesticChord = [523, 659, 784, 1047];
    majesticChord.forEach((freq) => {
      ["sine", "triangle"].forEach((type) => {
        const o = a.createOscillator();
        const g = a.createGain();
        o.type = type as OscillatorType;
        o.detune.value = Math.random() * 8 - 4;
        o.connect(g);
        g.connect(a.destination);
        o.frequency.setValueAtTime(freq, chordStart);
        g.gain.setValueAtTime(0, chordStart);
        g.gain.linearRampToValueAtTime(0.05, chordStart + 0.08);
        g.gain.exponentialRampToValueAtTime(0.003, chordStart + 1.5);
        o.start(chordStart);
        o.stop(chordStart + 1.5);
      });
    });

    // SPARKLE FLOURISH
    const sparkleStart = chordStart + 0.3;
    [2093, 2637, 3136, 3520, 4186].forEach((freq, i) => {
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = "sine";
      o.connect(g);
      g.connect(a.destination);
      const s = sparkleStart + i * 0.08;
      o.frequency.setValueAtTime(freq, s);
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.1, s + 0.01);
      g.gain.exponentialRampToValueAtTime(0.003, s + 0.25);
      o.start(s);
      o.stop(s + 0.25);
    });
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
