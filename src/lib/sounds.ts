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

/** ULTRA 8/8 LEGEND — cinematic orchestral crescendo */
export function playEpicWin() {
  try {
    const a = ctx();
    const t = a.currentTime;

    // Helper: warm brass-like tone using sine + harmonics (no sawtooth/square)
    const warmBrass = (freq: number, start: number, dur: number, vol: number) => {
      // Fundamental + overtones create a rich, warm brass timbre
      const harmonics = [1, 2, 3, 4, 5, 6];
      const harmVols = [1, 0.6, 0.35, 0.2, 0.1, 0.05];
      harmonics.forEach((h, i) => {
        const o = a.createOscillator();
        const g = a.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(freq * h, start);
        o.detune.value = Math.random() * 6 - 3;
        o.connect(g);
        g.connect(a.destination);
        g.gain.setValueAtTime(0, start);
        // Slow attack for swell feel
        g.gain.linearRampToValueAtTime(vol * harmVols[i], start + dur * 0.15);
        g.gain.setValueAtTime(vol * harmVols[i], start + dur * 0.6);
        g.gain.exponentialRampToValueAtTime(0.001, start + dur);
        o.start(start);
        o.stop(start + dur);
      });
    };

    // DEEP BOOM — cinematic impact hit
    const boomBuf = a.createBuffer(1, a.sampleRate * 0.4, a.sampleRate);
    const boomData = boomBuf.getChannelData(0);
    for (let j = 0; j < boomBuf.length; j++) {
      boomData[j] = Math.sin(2 * Math.PI * (50 + 30 * Math.pow(1 - j / boomBuf.length, 2)) * j / a.sampleRate)
        * Math.pow(1 - j / boomBuf.length, 1.5) * 0.4;
    }
    const boomSrc = a.createBufferSource();
    boomSrc.buffer = boomBuf;
    const boomG = a.createGain();
    boomG.gain.setValueAtTime(0.35, t);
    boomG.gain.exponentialRampToValueAtTime(0.005, t + 0.8);
    boomSrc.connect(boomG);
    boomG.connect(a.destination);
    boomSrc.start(t);
    boomSrc.stop(t + 0.8);

    // ORCHESTRAL SWELL — rising brass chord, slow and majestic
    // C major chord swelling up across 2 octaves
    const swellStart = t + 0.2;

    // Low brass foundation (C3, E3, G3)
    warmBrass(131, swellStart, 2.5, 0.04);
    warmBrass(165, swellStart, 2.5, 0.035);
    warmBrass(196, swellStart, 2.5, 0.03);

    // Mid brass enters slightly later (C4, E4, G4)
    warmBrass(262, swellStart + 0.3, 2.2, 0.045);
    warmBrass(330, swellStart + 0.3, 2.2, 0.04);
    warmBrass(392, swellStart + 0.3, 2.2, 0.035);

    // High brass crowning moment (C5, E5, G5)
    warmBrass(523, swellStart + 0.7, 1.8, 0.04);
    warmBrass(659, swellStart + 0.7, 1.8, 0.035);
    warmBrass(784, swellStart + 0.7, 1.8, 0.03);

    // THE RESOLVE — final triumphant high C held with vibrato
    const resolveStart = swellStart + 1.2;
    const resolveFreq = 1047; // C6
    const ro = a.createOscillator();
    const ro2 = a.createOscillator();
    const rg = a.createGain();
    const vibrato = a.createOscillator();
    const vibratoGain = a.createGain();
    ro.type = "sine";
    ro2.type = "sine";
    ro2.detune.value = 7; // slight chorus
    vibrato.type = "sine";
    vibrato.frequency.setValueAtTime(5, resolveStart); // 5Hz vibrato
    vibratoGain.gain.setValueAtTime(8, resolveStart); // 8 cents depth
    vibrato.connect(vibratoGain);
    vibratoGain.connect(ro.frequency);
    vibratoGain.connect(ro2.frequency);
    ro.connect(rg);
    ro2.connect(rg);
    rg.connect(a.destination);
    ro.frequency.setValueAtTime(resolveFreq, resolveStart);
    ro2.frequency.setValueAtTime(resolveFreq, resolveStart);
    rg.gain.setValueAtTime(0, resolveStart);
    rg.gain.linearRampToValueAtTime(0.06, resolveStart + 0.2);
    rg.gain.setValueAtTime(0.06, resolveStart + 1.0);
    rg.gain.exponentialRampToValueAtTime(0.001, resolveStart + 2.0);
    ro.start(resolveStart);
    ro2.start(resolveStart);
    vibrato.start(resolveStart);
    ro.stop(resolveStart + 2.0);
    ro2.stop(resolveStart + 2.0);
    vibrato.stop(resolveStart + 2.0);

    // SHIMMER — high ethereal sparkles at the peak
    const shimmerStart = swellStart + 1.5;
    [2093, 2637, 3136, 3520].forEach((freq, i) => {
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = "sine";
      o.connect(g);
      g.connect(a.destination);
      const s = shimmerStart + i * 0.12;
      o.frequency.setValueAtTime(freq, s);
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.08, s + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, s + 0.4);
      o.start(s);
      o.stop(s + 0.4);
    });
  } catch {}
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
