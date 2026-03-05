import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MedalTier } from "@/pages/Profile";

const MEDAL_COLORS: Record<MedalTier, { fill: string; glow: string; label: string }> = {
  bronze:   { fill: "#CD7F32", glow: "rgba(205,127,50,0.6)", label: "Bronze" },
  silver:   { fill: "#C0C0C0", glow: "rgba(192,192,192,0.6)", label: "Silver" },
  gold:     { fill: "#FFD700", glow: "rgba(255,215,0,0.6)", label: "Gold" },
  diamond:  { fill: "#B9F2FF", glow: "rgba(185,242,255,0.6)", label: "Diamond" },
  champion: { fill: "#E8D44D", glow: "rgba(232,212,77,0.6)", label: "Champion" },
};

const SPOTLIGHT_COLORS = [
  "rgba(255,0,100,0.25)",
  "rgba(0,150,255,0.25)",
  "rgba(255,200,0,0.3)",
  "rgba(100,0,255,0.2)",
  "rgba(0,255,150,0.2)",
];

interface Props {
  tier: MedalTier;
  milestone: number;
  onDone: () => void;
}

export default function MilestoneCelebration({ tier, milestone, onDone }: Props) {
  const [visible, setVisible] = useState(true);
  const colors = MEDAL_COLORS[tier];

  useEffect(() => {
    // Fire champagne poppers via canvas-confetti
    fireChampagnePoppers();

    // Play the party sound
    playMilestoneParty();

    // Auto-dismiss after ~4s
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence onExitComplete={onDone}>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Spotlights */}
          {SPOTLIGHT_COLORS.map((color, i) => (
            <motion.div
              key={i}
              className="absolute inset-0"
              style={{
                background: `radial-gradient(ellipse at ${20 + i * 15}% ${30 + (i % 3) * 20}%, ${color} 0%, transparent 60%)`,
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: [0, 1, 0.6, 1, 0],
                scale: [0.8, 1.1, 1, 1.05, 0.9],
              }}
              transition={{
                duration: 4,
                delay: i * 0.15,
                ease: "easeInOut",
              }}
            />
          ))}

          {/* Sweeping spotlight beams */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: `conic-gradient(from 0deg at 50% 120%, transparent 0deg, rgba(255,255,255,0.08) 10deg, transparent 20deg, transparent 90deg, rgba(255,200,0,0.06) 100deg, transparent 110deg, transparent 180deg, rgba(100,150,255,0.06) 190deg, transparent 200deg, transparent 270deg, rgba(255,100,200,0.06) 280deg, transparent 290deg)`,
            }}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 6, ease: "linear" }}
          />

          {/* Banner */}
          <motion.div
            className="relative z-10 flex flex-col items-center gap-3 pointer-events-none"
            initial={{ scale: 0.3, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
          >
            {/* Glowing medal */}
            <motion.div
              className="relative"
              animate={{
                filter: [
                  `drop-shadow(0 0 8px ${colors.glow})`,
                  `drop-shadow(0 0 25px ${colors.glow})`,
                  `drop-shadow(0 0 8px ${colors.glow})`,
                ],
              }}
              transition={{ duration: 1.5, repeat: 2, ease: "easeInOut" }}
            >
              <svg width={72} height={72} viewBox="0 0 32 32" fill="none">
                <path d="M12 2L16 12L20 2" stroke={colors.fill} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <circle cx="16" cy="20" r="10" fill={colors.fill} stroke={colors.fill} strokeWidth="1.5" />
                <circle cx="16" cy="20" r="6.5" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
                <path d="M16 15.5L17.5 18.5L20.5 19L18.2 21.2L18.8 24.5L16 23L13.2 24.5L13.8 21.2L11.5 19L14.5 18.5Z" fill="rgba(255,255,255,0.5)" />
              </svg>
            </motion.div>

            {/* Text */}
            <motion.div
              className="rounded-2xl px-8 py-4 text-center"
              style={{
                background: `linear-gradient(135deg, ${colors.fill}22, ${colors.fill}44)`,
                backdropFilter: "blur(16px)",
                border: `2px solid ${colors.fill}66`,
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <p className="text-2xl font-extrabold text-foreground tracking-tight">
                {colors.label} Unlocked!
              </p>
              <p className="text-sm font-semibold text-muted-foreground mt-1">
                {milestone} challenges completed 🎉
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Champagne popper effect — upward bursts from bottom corners + center pop */
function fireChampagnePoppers() {
  import("canvas-confetti").then(({ default: confetti }) => {
    const champagneColors = ["#FFD700", "#FFF8DC", "#FFFACD", "#F0E68C", "#DAA520", "#FF69B4", "#87CEEB", "#98FB98"];

    // Center pop — big burst upward
    confetti({
      particleCount: 120,
      spread: 100,
      origin: { x: 0.5, y: 0.7 },
      colors: champagneColors,
      startVelocity: 55,
      gravity: 1.2,
      ticks: 200,
      scalar: 1.1,
      shapes: ["circle", "square"],
    });

    // Left bottle pop
    setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 75,
        spread: 50,
        origin: { x: 0.15, y: 0.85 },
        colors: champagneColors,
        startVelocity: 60,
        gravity: 1.1,
        ticks: 180,
        scalar: 0.9,
      });
    }, 150);

    // Right bottle pop
    setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 105,
        spread: 50,
        origin: { x: 0.85, y: 0.85 },
        colors: champagneColors,
        startVelocity: 60,
        gravity: 1.1,
        ticks: 180,
        scalar: 0.9,
      });
    }, 300);

    // Delayed fizz — small particles drifting up
    const fizzEnd = Date.now() + 1500;
    const fizz = () => {
      confetti({
        particleCount: 3,
        spread: 40,
        origin: { x: 0.3 + Math.random() * 0.4, y: 0.9 },
        colors: ["#FFF8DC", "#FFFACD", "#FFD700"],
        startVelocity: 20,
        gravity: 0.5,
        ticks: 100,
        scalar: 0.6,
        shapes: ["circle"],
      });
      if (Date.now() < fizzEnd) requestAnimationFrame(fizz);
    };
    setTimeout(fizz, 500);
  });
}

/** Big party celebration sound — champagne pop + crowd cheer + sparkle */
function playMilestoneParty() {
  try {
    const a = new (window.AudioContext || (window as any).webkitAudioContext)();
    const t = a.currentTime;

    const master = a.createGain();
    master.gain.setValueAtTime(1.4, t);
    master.connect(a.destination);

    // POP — short noise burst (champagne cork)
    const popBuf = a.createBuffer(1, a.sampleRate * 0.08, a.sampleRate);
    const popData = popBuf.getChannelData(0);
    for (let j = 0; j < popBuf.length; j++) {
      popData[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / popBuf.length, 6);
    }
    const popSrc = a.createBufferSource();
    popSrc.buffer = popBuf;
    const popHP = a.createBiquadFilter();
    popHP.type = "bandpass";
    popHP.frequency.value = 2000;
    popHP.Q.value = 1;
    const popGain = a.createGain();
    popGain.gain.setValueAtTime(0.5, t);
    popGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    popSrc.connect(popHP);
    popHP.connect(popGain);
    popGain.connect(master);
    popSrc.start(t);
    popSrc.stop(t + 0.08);

    // Low thump under the pop
    const thump = a.createOscillator();
    const thumpG = a.createGain();
    thump.type = "sine";
    thump.frequency.setValueAtTime(120, t);
    thump.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    thumpG.gain.setValueAtTime(0.4, t);
    thumpG.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    thump.connect(thumpG);
    thumpG.connect(master);
    thump.start(t);
    thump.stop(t + 0.15);

    // Fizz — longer hissing noise
    const fizzBuf = a.createBuffer(1, a.sampleRate * 1.5, a.sampleRate);
    const fizzData = fizzBuf.getChannelData(0);
    for (let j = 0; j < fizzBuf.length; j++) {
      fizzData[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / fizzBuf.length, 2);
    }
    const fizzSrc = a.createBufferSource();
    fizzSrc.buffer = fizzBuf;
    const fizzHP = a.createBiquadFilter();
    fizzHP.type = "highpass";
    fizzHP.frequency.value = 5000;
    const fizzGain = a.createGain();
    fizzGain.gain.setValueAtTime(0, t + 0.05);
    fizzGain.gain.linearRampToValueAtTime(0.12, t + 0.15);
    fizzGain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    fizzSrc.connect(fizzHP);
    fizzHP.connect(fizzGain);
    fizzGain.connect(master);
    fizzSrc.start(t + 0.05);
    fizzSrc.stop(t + 1.5);

    // Celebration fanfare — rising chord
    const fanfareStart = t + 0.2;
    const notes = [262, 330, 392, 523, 659, 784];
    notes.forEach((freq, i) => {
      const o = a.createOscillator();
      const o2 = a.createOscillator();
      const g = a.createGain();
      o.type = "sine";
      o2.type = "triangle";
      o2.detune.value = 6;
      o.connect(g);
      o2.connect(g);
      g.connect(master);
      const s = fanfareStart + i * 0.07;
      o.frequency.setValueAtTime(freq, s);
      o2.frequency.setValueAtTime(freq * 1.5, s);
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.12, s + 0.02);
      g.gain.exponentialRampToValueAtTime(0.005, s + 0.5);
      o.start(s);
      o2.start(s);
      o.stop(s + 0.5);
      o2.stop(s + 0.5);
    });

    // Shimmer chord
    const chordStart = fanfareStart + notes.length * 0.07 + 0.1;
    [523, 659, 784, 1047].forEach((freq) => {
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = "sine";
      o.detune.value = Math.random() * 8 - 4;
      o.connect(g);
      g.connect(master);
      o.frequency.setValueAtTime(freq, chordStart);
      g.gain.setValueAtTime(0, chordStart);
      g.gain.linearRampToValueAtTime(0.08, chordStart + 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, chordStart + 1.2);
      o.start(chordStart);
      o.stop(chordStart + 1.2);
    });

    // Sparkle pings
    const sparkleStart = chordStart + 0.3;
    [2637, 3136, 3520, 4186, 3520].forEach((freq, i) => {
      const o = a.createOscillator();
      const g = a.createGain();
      o.type = "sine";
      o.connect(g);
      g.connect(master);
      const s = sparkleStart + i * 0.1;
      o.frequency.setValueAtTime(freq, s);
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(0.1, s + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, s + 0.25);
      o.start(s);
      o.stop(s + 0.25);
    });
  } catch {}
}
