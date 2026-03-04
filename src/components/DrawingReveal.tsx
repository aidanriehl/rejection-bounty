import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { fireEpicConfetti } from "@/lib/confetti";
import { playBigWin, playReelTick } from "@/lib/sounds";

interface DrawingRevealProps {
  potAmount: number;
  playerCount: number;
  winnerName: string;
  onContinue: () => void;
}

const FAKE_NAMES = [
  "brave_sarah", "rejection_king", "fearless_mike", "courage_queen",
  "bold_alex", "daring_dana", "gutsy_greg", "nervy_nina",
  "plucky_pat", "valiant_vic", "hardy_hank", "daring_dee",
  "risky_rob", "audacious_amy", "intrepid_ian", "gallant_gina",
];

const ITEM_HEIGHT = 56; // px per name row
const VISIBLE_COUNT = 3; // names visible in window

type Phase = "spinning" | "slowing" | "winner" | "done";

export default function DrawingReveal({ potAmount, playerCount, winnerName, onContinue }: DrawingRevealProps) {
  const [phase, setPhase] = useState<Phase>("spinning");

  // Build the reel: lots of fake names, winner placed near the end
  const reelNames = useMemo(() => {
    const names: string[] = [];
    // ~40 names of spinning, then the winner
    for (let i = 0; i < 40; i++) {
      names.push(FAKE_NAMES[i % FAKE_NAMES.length]);
    }
    names.push(winnerName);
    // A couple more after so the reel has content below
    names.push(FAKE_NAMES[3], FAKE_NAMES[7]);
    return names;
  }, [winnerName]);

  const winnerIndex = reelNames.length - 3; // the winner is 3rd from end
  const finalOffset = -(winnerIndex - 1) * ITEM_HEIGHT; // center the winner in the 3-row window

  // Motion values for the reel position
  const reelY = useMotionValue(0);
  const springY = useSpring(reelY, { stiffness: 80, damping: 18, mass: 1 });
  const tickRef = useRef(0);

  // Play tick sounds as names pass
  useEffect(() => {
    const unsub = reelY.on("change", (v) => {
      const currentSlot = Math.floor(Math.abs(v) / ITEM_HEIGHT);
      if (currentSlot !== tickRef.current) {
        tickRef.current = currentSlot;
        if (phase === "spinning" || phase === "slowing") {
          playReelTick();
          if (navigator.vibrate) navigator.vibrate(8);
        }
      }
    });
    return unsub;
  }, [reelY, phase]);

  // Animate the reel
  useEffect(() => {
    if (phase !== "spinning") return;

    let frame: number;
    let start: number | null = null;
    const spinDuration = 2200; // total ms
    const fastEnd = 800; // fast phase ms
    const totalDistance = Math.abs(finalOffset);

    const animate = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / spinDuration, 1);

      // Easing: fast start, dramatic slowdown
      let eased: number;
      if (elapsed < fastEnd) {
        // Linear fast phase
        eased = (elapsed / spinDuration) * 0.5;
      } else {
        // Deceleration curve
        const slowProgress = (elapsed - fastEnd) / (spinDuration - fastEnd);
        const decel = 1 - Math.pow(1 - slowProgress, 3);
        eased = 0.5 + decel * 0.5;
      }

      reelY.set(-eased * totalDistance);

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      } else {
        // Snap to final with spring bounce
        setPhase("slowing");
        springY.set(finalOffset);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [phase, finalOffset, reelY, springY]);

  // When spring settles → winner phase
  useEffect(() => {
    if (phase !== "slowing") return;
    const unsub = springY.on("change", (v) => {
      if (Math.abs(v - finalOffset) < 0.5) {
        setPhase("winner");
      }
    });
    // Fallback timer
    const t = setTimeout(() => setPhase("winner"), 800);
    return () => { unsub(); clearTimeout(t); };
  }, [phase, springY, finalOffset]);

  // Winner celebration
  useEffect(() => {
    if (phase === "winner") {
      fireEpicConfetti();
      playBigWin();
      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
      const t = setTimeout(() => setPhase("done"), 800);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const isWon = phase === "winner" || phase === "done";

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: "hsl(var(--background))" }}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -200 }}
      transition={{ duration: 0.4 }}
    >
      {/* Pot info */}
      <motion.div
        className="mb-6 text-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <motion.span
          className="text-4xl block mb-2"
          animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
          transition={{ duration: 0.6 }}
        >
          🎰
        </motion.span>
        <p className="text-sm font-bold text-foreground">
          ${potAmount.toLocaleString()} pot · {playerCount} players
        </p>
      </motion.div>

      {/* Status text */}
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
        {isWon ? "🎉 Winner!" : "Selecting winner..."}
      </p>

      {/* Slot Machine Frame */}
      <div
        className="relative rounded-2xl p-[3px] shadow-lg"
        style={{
          background: "linear-gradient(135deg, hsl(var(--muted-foreground) / 0.4), hsl(var(--muted-foreground) / 0.15), hsl(var(--muted-foreground) / 0.4))",
        }}
      >
        <div
          className="relative rounded-[13px] overflow-hidden"
          style={{
            width: 280,
            height: ITEM_HEIGHT * VISIBLE_COUNT,
            backgroundColor: "hsl(var(--card))",
          }}
        >
          {/* Reel strip */}
          <motion.div
            style={{ y: phase === "slowing" || isWon ? springY : reelY }}
          >
            {reelNames.map((name, i) => (
              <div
                key={`${name}-${i}`}
                className="flex items-center justify-center font-extrabold"
                style={{
                  height: ITEM_HEIGHT,
                  fontSize: isWon && i === winnerIndex ? 26 : 22,
                  color: isWon && i === winnerIndex
                    ? "hsl(var(--primary))"
                    : "hsl(var(--foreground))",
                  transition: "color 0.3s, font-size 0.3s",
                }}
              >
                {name}
              </div>
            ))}
          </motion.div>

          {/* Top/bottom fade overlays */}
          <div
            className="absolute inset-x-0 top-0 pointer-events-none"
            style={{
              height: ITEM_HEIGHT,
              background: "linear-gradient(to bottom, hsl(var(--card)), transparent)",
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 pointer-events-none"
            style={{
              height: ITEM_HEIGHT,
              background: "linear-gradient(to top, hsl(var(--card)), transparent)",
            }}
          />

          {/* Center selection line */}
          <div
            className="absolute inset-x-0 pointer-events-none"
            style={{
              top: ITEM_HEIGHT - 1,
              height: ITEM_HEIGHT + 2,
              borderTop: "2px solid hsl(var(--primary) / 0.5)",
              borderBottom: "2px solid hsl(var(--primary) / 0.5)",
              background: isWon ? "hsl(var(--primary) / 0.08)" : "transparent",
              transition: "background 0.3s",
            }}
          />
        </div>
      </div>

      {/* Prize amount on winner */}
      <AnimatePresence>
        {isWon && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="mt-6 text-center"
          >
            <p className="text-lg font-bold text-foreground">
              wins <span className="text-primary">${potAmount.toLocaleString()}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Congratulations! 🎉
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Continue button */}
      <AnimatePresence>
        {phase === "done" && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: "spring" }}
            onClick={onContinue}
            className="mt-10 rounded-full bg-primary px-8 py-3 text-sm font-bold text-primary-foreground shadow-md active:scale-95 transition-transform"
          >
            See Last Week's Recap
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
