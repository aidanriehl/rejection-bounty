import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playBigWin, playPop } from "@/lib/sounds";

interface DropRevealProps {
  onRevealComplete: () => void;
}

const stageText = ["Tap to open", "Keep going...", "Almost there..."];

const shakeVariants = {
  shake: {
    x: [0, -8, 8, -6, 6, -3, 3, 0],
    transition: { duration: 0.5 },
  },
};

function BountyChest({ stage }: { stage: number }) {
  return (
    <svg
      viewBox="0 0 200 180"
      className="w-48 h-48 drop-shadow-2xl"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Chest body */}
      <rect
        x="30"
        y="80"
        width="140"
        height="80"
        rx="8"
        fill="hsl(var(--gold))"
        stroke="hsl(var(--primary))"
        strokeWidth="3"
      />
      {/* Chest body darker band */}
      <rect
        x="30"
        y="110"
        width="140"
        height="20"
        fill="hsl(var(--primary) / 0.2)"
      />
      {/* Metal corners */}
      <circle cx="40" cy="90" r="4" fill="hsl(var(--primary))" />
      <circle cx="160" cy="90" r="4" fill="hsl(var(--primary))" />
      <circle cx="40" cy="150" r="4" fill="hsl(var(--primary))" />
      <circle cx="160" cy="150" r="4" fill="hsl(var(--primary))" />

      {/* Lid */}
      <motion.g
        animate={{
          rotateX: stage === 0 ? 0 : stage === 1 ? -8 : -25,
          y: stage === 0 ? 0 : stage === 1 ? -4 : -14,
        }}
        transition={{ type: "spring", stiffness: 200, damping: 12 }}
        style={{ originX: "50%", originY: "100%" }}
      >
        <path
          d="M25 82 Q100 20 175 82"
          fill="hsl(var(--gold))"
          stroke="hsl(var(--primary))"
          strokeWidth="3"
        />
        <rect
          x="25"
          y="68"
          width="150"
          height="16"
          rx="4"
          fill="hsl(var(--gold))"
          stroke="hsl(var(--primary))"
          strokeWidth="3"
        />
        {/* Lid highlight */}
        <rect
          x="45"
          y="72"
          width="110"
          height="6"
          rx="3"
          fill="hsl(var(--primary-foreground) / 0.3)"
        />
      </motion.g>

      {/* Lock */}
      <AnimatePresence>
        {stage < 2 && (
          <motion.g
            exit={{ opacity: 0, scale: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <rect
              x="88"
              y="90"
              width="24"
              height="20"
              rx="4"
              fill="hsl(var(--primary))"
            />
            <circle
              cx="100"
              cy="86"
              r="10"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="4"
            />
            {/* Crack on stage 1 */}
            {stage === 1 && (
              <motion.line
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                x1="95"
                y1="88"
                x2="105"
                y2="108"
                stroke="hsl(var(--destructive))"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}
          </motion.g>
        )}
      </AnimatePresence>

      {/* Keyhole */}
      <circle cx="100" cy="100" r="3" fill="hsl(var(--gold))" />
    </svg>
  );
}

function Particles({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * 360;
        const distance = 60 + Math.random() * 40;
        const x = Math.cos((angle * Math.PI) / 180) * distance;
        const y = Math.sin((angle * Math.PI) / 180) * distance;
        return (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              backgroundColor: i % 2 === 0 ? "hsl(var(--gold))" : "hsl(var(--primary))",
              top: "50%",
              left: "50%",
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x, y, opacity: 0, scale: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        );
      })}
    </>
  );
}

export default function DropReveal({ onRevealComplete }: DropRevealProps) {
  const [stage, setStage] = useState(0);
  const [particles, setParticles] = useState<number[]>([]);
  const [exiting, setExiting] = useState(false);

  const handleTap = useCallback(() => {
    if (exiting) return;

    if (stage < 2) {
      const nextStage = stage + 1;
      setStage(nextStage);
      setParticles((p) => [...p, Date.now()]);
      if (navigator.vibrate) navigator.vibrate(30);
      playPop();
    } else {
      // Stage 2 → final reveal
      setStage(3);
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
      playBigWin();
      setExiting(true);
      setTimeout(() => {
        onRevealComplete();
      }, 600);
    }
  }, [stage, exiting, onRevealComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center"
      style={{
        background: "linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(0 0% 4%) 100%)",
      }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      onClick={handleTap}
    >
      {/* Golden glow behind chest — grows with stage */}
      <motion.div
        className="absolute rounded-full"
        style={{
          background: "radial-gradient(circle, hsl(var(--gold) / 0.4) 0%, transparent 70%)",
        }}
        animate={{
          width: stage === 0 ? 200 : stage === 1 ? 280 : stage >= 2 ? 500 : 200,
          height: stage === 0 ? 200 : stage === 1 ? 280 : stage >= 2 ? 500 : 200,
          opacity: stage >= 3 ? 1 : 0.6,
        }}
        transition={{ type: "spring", stiffness: 100 }}
      />

      {/* Chest */}
      <motion.div
        className="relative cursor-pointer select-none"
        variants={shakeVariants}
        animate={stage > 0 && stage < 3 ? "shake" : undefined}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          animate={
            stage >= 3
              ? { scale: 1.3, opacity: 0, y: -40 }
              : { scale: 1, opacity: 1, y: 0 }
          }
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <BountyChest stage={stage} />
        </motion.div>

        {/* Particle bursts */}
        {particles.map((key) => (
          <Particles key={key} count={stage >= 2 ? 16 : 8} />
        ))}
      </motion.div>

      {/* Text prompt */}
      <motion.p
        className="mt-8 text-lg font-bold text-primary-foreground"
        animate={{ opacity: stage >= 3 ? 0 : [0.6, 1, 0.6] }}
        transition={
          stage >= 3
            ? { duration: 0.3 }
            : { duration: 2, repeat: Infinity, ease: "easeInOut" }
        }
      >
        {stage < 3 ? stageText[stage] : ""}
      </motion.p>

      {/* Week label */}
      <motion.p
        className="absolute top-16 text-sm font-semibold tracking-widest uppercase text-primary-foreground/60"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        This Week's Drop
      </motion.p>
    </motion.div>
  );
}
