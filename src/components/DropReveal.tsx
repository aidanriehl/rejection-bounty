import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playBigWin, playPop } from "@/lib/sounds";

interface DropRevealProps {
  onRevealComplete: () => void;
}

const stageText = ["Tap to break out", "Keep going...", "Almost free..."];

function CrackLines({ stage }: { stage: number }) {
  if (stage === 0) return null;
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 200 200"
    >
      {/* Stage 1 cracks */}
      <motion.path
        d="M100 30 L95 60 L105 80 L90 110"
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.8 }}
        transition={{ duration: 0.4 }}
      />
      <motion.path
        d="M140 50 L120 70 L130 95"
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.7 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      />

      {/* Stage 2 — more dramatic cracks */}
      {stage >= 2 && (
        <>
          <motion.path
            d="M60 40 L80 75 L70 100 L85 140"
            fill="none"
            stroke="hsl(var(--destructive))"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.9 }}
            transition={{ duration: 0.4 }}
          />
          <motion.path
            d="M150 80 L125 100 L140 130 L110 160"
            fill="none"
            stroke="hsl(var(--destructive))"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.8 }}
            transition={{ duration: 0.35, delay: 0.1 }}
          />
          <motion.path
            d="M90 140 L100 165 L80 180"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.7 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          />
        </>
      )}
    </svg>
  );
}

function Sparks({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * 360;
        const distance = 50 + Math.random() * 50;
        const x = Math.cos((angle * Math.PI) / 180) * distance;
        const y = Math.sin((angle * Math.PI) / 180) * distance;
        return (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor:
                i % 3 === 0
                  ? "hsl(var(--gold))"
                  : i % 3 === 1
                  ? "hsl(var(--primary))"
                  : "hsl(var(--destructive))",
              top: "50%",
              left: "50%",
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x, y, opacity: 0, scale: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        );
      })}
    </>
  );
}

function ShatterPieces() {
  const pieces = Array.from({ length: 12 }).map((_, i) => {
    const angle = (i / 12) * 360;
    const dist = 80 + Math.random() * 60;
    return {
      x: Math.cos((angle * Math.PI) / 180) * dist,
      y: Math.sin((angle * Math.PI) / 180) * dist,
      rotate: Math.random() * 360,
      size: 12 + Math.random() * 20,
    };
  });

  return (
    <>
      {pieces.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-sm"
          style={{
            width: p.size,
            height: p.size,
            background:
              i % 3 === 0
                ? "hsl(var(--primary) / 0.7)"
                : i % 3 === 1
                ? "hsl(var(--gold) / 0.6)"
                : "hsl(var(--muted-foreground) / 0.4)",
            top: "50%",
            left: "50%",
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
          animate={{
            x: p.x,
            y: p.y,
            opacity: 0,
            scale: 0.3,
            rotate: p.rotate,
          }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      ))}
    </>
  );
}

const shakeVariants = {
  shake: {
    x: [0, -8, 8, -6, 6, -3, 3, 0],
    transition: { duration: 0.5 },
  },
};

export default function DropReveal({ onRevealComplete }: DropRevealProps) {
  const [stage, setStage] = useState(0);
  const [sparks, setSparks] = useState<number[]>([]);
  const [exiting, setExiting] = useState(false);

  const handleTap = useCallback(() => {
    if (exiting) return;

    if (stage < 2) {
      const nextStage = stage + 1;
      setStage(nextStage);
      setSparks((p) => [...p, Date.now()]);
      if (navigator.vibrate) navigator.vibrate(30);
      playPop();
    } else {
      // Stage 2 → final shatter
      setStage(3);
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
      playBigWin();
      setExiting(true);
      setTimeout(() => {
        onRevealComplete();
      }, 900);
    }
  }, [stage, exiting, onRevealComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center"
      style={{
        backgroundColor: "hsl(var(--background))",
      }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      onClick={handleTap}
    >
      {/* Header text — positioned relative to the logo, not absolute top */}
      <motion.div
        className="mb-12 text-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-3xl font-extrabold tracking-tight text-foreground">
          8 new challenges await
        </p>
      </motion.div>

      {/* Glow behind logo */}
      <motion.div
        className="absolute rounded-full"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)",
        }}
        animate={{
          width: stage === 0 ? 240 : stage === 1 ? 300 : stage >= 2 ? 400 : 240,
          height: stage === 0 ? 240 : stage === 1 ? 300 : stage >= 2 ? 400 : 240,
          opacity: stage >= 3 ? 0 : 0.8,
        }}
        transition={{ type: "spring", stiffness: 100 }}
      />

      {/* Logo + effects */}
      <motion.div
        className="relative cursor-pointer select-none flex items-center justify-center"
        variants={shakeVariants}
        animate={stage > 0 && stage < 3 ? "shake" : undefined}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          className="relative"
          animate={
            stage >= 3
              ? { scale: 1.4, opacity: 0 }
              : { scale: 1, opacity: 1 }
          }
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {/* Frozen/icy border effect */}
          <motion.div
            className="w-36 h-36 rounded-3xl flex items-center justify-center relative overflow-hidden"
            style={{
              background:
                stage === 0
                  ? "linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(200 40% 90%))"
                  : stage === 1
                  ? "linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--gold) / 0.15))"
                  : "linear-gradient(135deg, hsl(var(--destructive) / 0.15), hsl(var(--gold) / 0.2))",
              border: "2px solid hsl(var(--primary) / 0.25)",
              boxShadow:
                stage === 0
                  ? "0 0 30px hsl(var(--primary) / 0.1), inset 0 0 20px hsl(200 60% 95% / 0.5)"
                  : "0 0 40px hsl(var(--gold) / 0.2)",
            }}
          >
            {/* Logo emoji */}
            <motion.span
              className="text-7xl select-none"
              style={{
                filter: stage === 0 ? "brightness(0.9) saturate(0.7)" : "none",
              }}
              animate={{
                filter:
                  stage === 0
                    ? "brightness(0.9) saturate(0.7)"
                    : stage === 1
                    ? "brightness(1) saturate(1)"
                    : "brightness(1.1) saturate(1.2)",
              }}
            >
              🔥
            </motion.span>

            {/* Crack overlay */}
            <CrackLines stage={stage} />

            {/* Frost overlay — fades on taps */}
            <motion.div
              className="absolute inset-0 rounded-3xl pointer-events-none"
              style={{
                background:
                  "linear-gradient(135deg, hsl(200 80% 95% / 0.4) 0%, transparent 60%)",
              }}
              animate={{ opacity: stage === 0 ? 1 : stage === 1 ? 0.4 : 0 }}
              transition={{ duration: 0.3 }}
            />
          </motion.div>
        </motion.div>

        {/* Shatter pieces on stage 3 */}
        <AnimatePresence>
          {stage >= 3 && <ShatterPieces />}
        </AnimatePresence>

        {/* Sparks */}
        {sparks.map((key) => (
          <Sparks key={key} count={stage >= 2 ? 16 : 8} />
        ))}
      </motion.div>


      {/* Prompt text */}
      <motion.p
        className="mt-10 text-lg font-bold text-foreground"
        animate={{ opacity: stage >= 3 ? 0 : [0.5, 1, 0.5] }}
        transition={
          stage >= 3
            ? { duration: 0.3 }
            : { duration: 2, repeat: Infinity, ease: "easeInOut" }
        }
      >
        {stage < 3 ? stageText[stage] : ""}
      </motion.p>
    </motion.div>
  );
}
