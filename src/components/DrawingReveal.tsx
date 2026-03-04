import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fireEpicConfetti } from "@/lib/confetti";
import { playBigWin, playPop } from "@/lib/sounds";

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

type Phase = "spinning" | "slowing" | "winner" | "done";

export default function DrawingReveal({ potAmount, playerCount, winnerName, onContinue }: DrawingRevealProps) {
  const [phase, setPhase] = useState<Phase>("spinning");
  const [currentName, setCurrentName] = useState(FAKE_NAMES[0]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const indexRef = useRef(0);

  // Fast spinning phase — starts immediately
  useEffect(() => {
    if (phase === "spinning") {
      playPop();
      const tick = () => {
        indexRef.current = (indexRef.current + 1) % FAKE_NAMES.length;
        setCurrentName(FAKE_NAMES[indexRef.current]);
      };
      intervalRef.current = setInterval(tick, 60);

      // After 800ms, slow down
      const slowTimer = setTimeout(() => {
        setPhase("slowing");
      }, 800);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        clearTimeout(slowTimer);
      };
    }
  }, [phase]);

  // Slowing down phase — ~1.2s with fewer steps
  useEffect(() => {
    if (phase !== "slowing") return;

    let speed = 100;
    let steps = 0;
    const maxSteps = 6;

    const doStep = () => {
      if (steps >= maxSteps) {
        setCurrentName(winnerName);
        setPhase("winner");
        return;
      }
      steps++;
      speed += 60 + steps * 25;
      indexRef.current = (indexRef.current + 1) % FAKE_NAMES.length;
      setCurrentName(steps === maxSteps - 1 ? winnerName : FAKE_NAMES[indexRef.current]);
      if (navigator.vibrate) navigator.vibrate(15);
      setTimeout(doStep, speed);
    };

    const t = setTimeout(doStep, speed);
    return () => clearTimeout(t);
  }, [phase, winnerName]);

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

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: "hsl(var(--background))" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -200 }}
      transition={{ duration: 0.4 }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key="spinner"
          className="text-center w-full max-w-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {/* Pot info always visible */}
          <motion.div
            className="mb-6"
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

          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6">
            {phase === "winner" || phase === "done" ? "🎉 Winner!" : "Selecting winner..."}
          </p>

            {/* Name display */}
            <div className="relative h-20 flex items-center justify-center overflow-hidden">
              <AnimatePresence mode="popLayout">
                <motion.p
                  key={currentName}
                  className={
                    phase === "winner" || phase === "done"
                      ? "text-4xl font-extrabold text-primary"
                      : "text-3xl font-extrabold text-foreground"
                  }
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -30, opacity: 0 }}
                  transition={{ duration: phase === "spinning" ? 0.04 : 0.1 }}
                >
                  {currentName}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Prize amount on winner */}
            <AnimatePresence>
              {(phase === "winner" || phase === "done") && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="mt-4"
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

            {/* Continue button after winner reveal */}
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
        )}
      </AnimatePresence>
    </motion.div>
  );
}
