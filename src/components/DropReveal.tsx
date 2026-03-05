import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playBigWin, playPop } from "@/lib/sounds";
import logoImg from "@/assets/logo.png";

interface DropRevealProps {
  onRevealComplete: () => void;
}

const stageText = ["Tap to open", "Keep going…", "One more…"];

// The top flap angles at each stage (0 = sealed, final = wide open)
const flapAngles = [0, -25, -55, -110];

function Sparks({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * 360;
        const distance = 60 + Math.random() * 60;
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

function PackageSVG({ stage }: { stage: number }) {
  const flapAngle = flapAngles[Math.min(stage, 3)];
  const bodyColor = "hsl(var(--primary))";
  const bodyColorDark = "hsl(var(--primary) / 0.8)";
  const sealColor = "hsl(var(--primary) / 0.6)";

  return (
    <svg viewBox="0 0 200 280" className="w-full h-full" style={{ filter: "drop-shadow(0 8px 24px hsl(var(--primary) / 0.2))" }}>
      {/* Package body */}
      <path
        d="M40 70 L40 230 Q40 245 50 250 L80 260 Q100 268 120 260 L150 250 Q160 245 160 230 L160 70 Z"
        fill={bodyColor}
        stroke="hsl(var(--foreground) / 0.15)"
        strokeWidth="1.5"
      />

      {/* Side shadow */}
      <path
        d="M150 70 L160 70 L160 230 Q160 245 150 250 L150 70Z"
        fill={bodyColorDark}
        opacity="0.4"
      />

      {/* Bottom crimp */}
      <path
        d="M50 250 Q60 265 80 260 Q90 270 100 268 Q110 270 120 260 Q140 265 150 250"
        fill="none"
        stroke="hsl(var(--foreground) / 0.2)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Bottom zigzag */}
      {Array.from({ length: 8 }).map((_, i) => {
        const x1 = 50 + i * 13;
        const x2 = x1 + 6.5;
        const x3 = x1 + 13;
        return (
          <path
            key={`bottom-${i}`}
            d={`M${x1} 258 L${x2} 268 L${x3} 258`}
            fill={bodyColor}
            stroke="hsl(var(--foreground) / 0.1)"
            strokeWidth="0.5"
          />
        );
      })}

      {/* Logo on front */}
      <foreignObject x="55" y="130" width="90" height="90">
        <img src={logoImg} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain", filter: stage >= 2 ? "brightness(1.2)" : "none" }} />
      </foreignObject>

      {/* Top zigzag seal line (static part under flap) */}
      <path
        d="M45 72 Q55 60 65 72 Q75 60 85 72 Q95 60 105 72 Q115 60 125 72 Q135 60 145 72 Q155 60 160 68"
        fill="none"
        stroke="hsl(var(--foreground) / 0.15)"
        strokeWidth="1"
      />

      {/* Top flap - animates open */}
      <motion.g
        style={{ transformOrigin: "100px 70px" }}
        animate={{ rotateX: flapAngle }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        {/* Flap shape */}
        <path
          d="M40 70 L40 30 Q40 15 55 10 L80 5 Q100 0 120 5 L145 10 Q160 15 160 30 L160 70 Z"
          fill={bodyColor}
          stroke="hsl(var(--foreground) / 0.15)"
          strokeWidth="1.5"
        />
        {/* Flap inner shadow */}
        <path
          d="M40 70 L40 30 Q40 15 55 10 L80 5 Q100 0 120 5 L145 10 Q160 15 160 30 L160 70 Z"
          fill={sealColor}
          opacity="0.3"
        />
        {/* Top zigzag */}
        {Array.from({ length: 8 }).map((_, i) => {
          const x1 = 44 + i * 14.5;
          const x2 = x1 + 7.25;
          const x3 = x1 + 14.5;
          return (
            <path
              key={`top-${i}`}
              d={`M${x1} 5 L${x2} -5 L${x3} 5`}
              fill={bodyColor}
              stroke="hsl(var(--foreground) / 0.1)"
              strokeWidth="0.5"
            />
          );
        })}
        {/* Seal circle */}
        <motion.circle
          cx="100"
          cy="40"
          r="14"
          fill="hsl(var(--background))"
          stroke="hsl(var(--foreground) / 0.15)"
          strokeWidth="1.5"
          animate={{ opacity: stage >= 2 ? 0.3 : 0.8 }}
        />
        <motion.text
          x="100"
          y="45"
          textAnchor="middle"
          fontSize="14"
          fontWeight="bold"
          fill="hsl(var(--foreground))"
          animate={{ opacity: stage >= 2 ? 0.2 : 0.6 }}
        >
          NEW
        </motion.text>
      </motion.g>

      {/* Glow from inside when opening */}
      {stage >= 2 && (
        <motion.ellipse
          cx="100"
          cy="70"
          rx="40"
          ry="10"
          fill="hsl(var(--gold) / 0.4)"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0.3] }}
          transition={{ duration: 0.6 }}
        />
      )}
    </svg>
  );
}

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
      // Final open
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
      style={{ backgroundColor: "hsl(var(--background))" }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={handleTap}
    >
      {/* Header */}
      <motion.div
        className="mb-8 text-center"
        animate={{ opacity: stage >= 3 ? 0 : 1, y: stage >= 3 ? -20 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <p className="text-3xl font-extrabold tracking-tight text-foreground">
          8 new challenges await
        </p>
      </motion.div>

      {/* Glow */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, hsl(var(--primary) / 0.12) 0%, transparent 70%)",
        }}
        animate={{
          width: stage === 0 ? 280 : stage === 1 ? 340 : stage >= 2 ? 420 : 280,
          height: stage === 0 ? 280 : stage === 1 ? 340 : stage >= 2 ? 420 : 280,
          opacity: stage >= 3 ? 0 : 0.7,
        }}
        transition={{ type: "spring", stiffness: 100 }}
      />

      {/* Package */}
      <motion.div
        className="relative cursor-pointer select-none w-44 h-64"
        whileTap={{ scale: 0.96 }}
        animate={
          stage >= 3
            ? { scale: 1.2, opacity: 0, y: -40 }
            : { scale: 1, opacity: 1, y: 0 }
        }
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <PackageSVG stage={stage} />

        {/* Sparks */}
        <div className="absolute inset-0 flex items-center justify-center">
          {sparks.map((key) => (
            <Sparks key={key} count={stage >= 2 ? 16 : 8} />
          ))}
        </div>
      </motion.div>

      {/* Prompt */}
      <motion.p
        className="mt-8 text-lg font-bold text-foreground"
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
