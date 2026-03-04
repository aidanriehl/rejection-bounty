import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { fireEpicConfetti } from "@/lib/confetti";
import { playBigWin, playReelTick } from "@/lib/sounds";
import { supabase } from "@/integrations/supabase/client";

interface DrawingRevealProps {
  potAmount: number;
  playerCount: number;
  winnerName?: string;
  onContinue: () => void;
}

const FAKE_NAMES = [
  "brave_sarah", "rejection_king", "fearless_mike", "courage_queen",
  "bold_alex", "daring_dana", "gutsy_greg", "nervy_nina",
  "plucky_pat", "valiant_vic", "hardy_hank", "daring_dee",
  "risky_rob", "audacious_amy", "intrepid_ian", "gallant_gina",
];

const ITEM_HEIGHT = 48;

type Phase = "idle" | "spinning" | "slowing" | "winner" | "done";

// Pulsing light dot component
function LightDot({ index, isWon, total }: { index: number; isWon: boolean; total: number }) {
  return (
    <motion.div
      className="rounded-full"
      style={{
        width: 8,
        height: 8,
        backgroundColor: "hsl(var(--muted-foreground) / 0.15)",
      }}
      animate={
        isWon
          ? {
              backgroundColor: [
                "hsl(var(--primary))",
                "hsl(var(--destructive))",
                "hsl(var(--gold))",
                "hsl(var(--primary))",
              ],
              scale: [1, 1.4, 1],
              opacity: [0.7, 1, 0.7],
            }
          : {}
      }
      transition={
        isWon
          ? { duration: 0.6, repeat: Infinity, delay: index * 0.08 }
          : { duration: 0 }
      }
    />
  );
}

export default function DrawingReveal({ potAmount, playerCount, winnerName: propWinnerName, onContinue }: DrawingRevealProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [leverPulled, setLeverPulled] = useState(false);
  const [drawingStatus, setDrawingStatus] = useState<"pending" | "complete" | null>(null);
  const [resolvedWinner, setResolvedWinner] = useState<string | null>(propWinnerName ?? null);

  // Fetch drawing status for current week
  useEffect(() => {
    const fetchDrawing = async () => {
      const now = new Date();
      const jan1 = new Date(now.getFullYear(), 0, 1);
      const weekNum = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
      const weekKey = `${now.getFullYear()}-w${weekNum}`;

      const { data } = await supabase
        .from("weekly_drawings")
        .select("*, profiles:winner_user_id(username)")
        .eq("week_key", weekKey)
        .maybeSingle();

      if (data) {
        setDrawingStatus(data.status as "pending" | "complete");
        if (data.status === "complete" && (data as any).profiles?.username) {
          setResolvedWinner((data as any).profiles.username);
        }
      } else {
        setDrawingStatus("pending");
      }
    };
    fetchDrawing();

    // Realtime subscription
    const channel = supabase
      .channel("weekly_drawings_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "weekly_drawings" }, (payload) => {
        const row = payload.new as any;
        if (row?.status === "complete") {
          setDrawingStatus("complete");
          // Re-fetch to get joined username
          supabase
            .from("weekly_drawings")
            .select("*, profiles:winner_user_id(username)")
            .eq("id", row.id)
            .maybeSingle()
            .then(({ data: d }) => {
              if (d && (d as any).profiles?.username) {
                setResolvedWinner((d as any).profiles.username);
              }
            });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const winnerName = resolvedWinner ?? "???";

  const handleSpin = () => {
    if (phase !== "idle") return;
    // if (drawingStatus === "pending") return; // Temporarily allow spin always
    setLeverPulled(true);
    setPhase("spinning");
  };

  const reelNames = useMemo(() => {
    const names: string[] = [];
    for (let i = 0; i < 45; i++) {
      names.push(FAKE_NAMES[i % FAKE_NAMES.length]);
    }
    names.push(winnerName);
    names.push(FAKE_NAMES[3]);
    return names;
  }, [winnerName]);

  const winnerIndex = reelNames.length - 2;
  const finalOffset = -winnerIndex * ITEM_HEIGHT;

  const reelY = useMotionValue(0);
  const springY = useSpring(reelY, { stiffness: 60, damping: 14, mass: 1.2 });
  const tickRef = useRef(0);

  // (lever is now pulled via handleSpin)

  // Tick sounds
  useEffect(() => {
    const unsub = reelY.on("change", (v) => {
      const currentSlot = Math.floor(Math.abs(v) / ITEM_HEIGHT);
      if (currentSlot !== tickRef.current) {
        tickRef.current = currentSlot;
        if (phase === "spinning") {
          playReelTick();
          if (navigator.vibrate) navigator.vibrate(6);
        }
      }
    });
    return unsub;
  }, [reelY, phase]);

  // Main reel animation
  useEffect(() => {
    if (phase !== "spinning") return;

    let frame: number;
    let start: number | null = null;
    const spinDuration = 2600;
    const fastEnd = 1000;
    const totalDistance = Math.abs(finalOffset);

    const animate = (ts: number) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      const progress = Math.min(elapsed / spinDuration, 1);

      let eased: number;
      if (elapsed < fastEnd) {
        eased = (elapsed / spinDuration) * 0.45;
      } else {
        const slowProgress = (elapsed - fastEnd) / (spinDuration - fastEnd);
        const decel = 1 - Math.pow(1 - slowProgress, 3.5);
        eased = 0.45 + decel * 0.55;
      }

      reelY.set(-eased * totalDistance);

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      } else {
        setPhase("slowing");
        springY.set(finalOffset);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [phase, finalOffset, reelY, springY]);

  // Spring settle → winner
  useEffect(() => {
    if (phase !== "slowing") return;
    const unsub = springY.on("change", (v) => {
      if (Math.abs(v - finalOffset) < 0.5) {
        setPhase("winner");
      }
    });
    const t = setTimeout(() => setPhase("winner"), 1000);
    return () => { unsub(); clearTimeout(t); };
  }, [phase, springY, finalOffset]);

  // Winner celebration
  useEffect(() => {
    if (phase === "winner") {
      fireEpicConfetti();
      playBigWin();
      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
      const t = setTimeout(() => setPhase("done"), 1000);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const isWon = phase === "winner" || phase === "done";
  const lightCount = 12;

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: "hsl(var(--background))" }}
    >
      {/* Pot info above machine */}
      <motion.div
        className="mb-4 text-center"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <p className="text-sm font-bold text-foreground">
          ${potAmount.toLocaleString()} pot · {playerCount} players
        </p>
      </motion.div>

      {/* Slot Machine Body */}
      <div className="relative">
        {/* Machine outer frame */}
        <div
          className="relative rounded-3xl p-[3px]"
          style={{
            background: "linear-gradient(160deg, hsl(var(--muted-foreground) / 0.5), hsl(var(--muted-foreground) / 0.15), hsl(var(--muted-foreground) / 0.5))",
            width: 260,
          }}
        >
          <div
            className="rounded-[21px] flex flex-col items-center overflow-hidden"
            style={{
              backgroundColor: "hsl(var(--card))",
            }}
          >
            {/* JACKPOT label plate */}
            <div
              className="w-full py-2.5 text-center"
              style={{
                background: "linear-gradient(180deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.05))",
                borderBottom: "2px solid hsl(var(--primary) / 0.2)",
              }}
            >
              <motion.p
                className="text-xs font-black uppercase tracking-[0.3em] text-primary"
                animate={
                  isWon
                    ? { scale: [1, 1.1, 1], opacity: [1, 0.7, 1] }
                    : {}
                }
                transition={{ duration: 0.4, repeat: isWon ? 5 : 0 }}
              >
                {isWon ? "🎉 WINNER 🎉" : "JACKPOT"}
              </motion.p>
            </div>

            {/* Decorative lights - top row */}
            <div className="flex justify-center gap-3 py-2.5 w-full px-4">
              {Array.from({ length: lightCount }).map((_, i) => (
                <LightDot key={`top-${i}`} index={i} isWon={isWon} total={lightCount} />
              ))}
            </div>

            {/* Status text */}
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              {isWon ? "Winner Selected!" : phase === "idle" ? "Pull the lever or tap spin" : "Spinning..."}
            </p>

            {/* Reel window - single name */}
            <div className="relative px-4 w-full">
              <div
                className="relative rounded-xl overflow-hidden mx-auto"
                style={{
                  height: ITEM_HEIGHT,
                  width: "100%",
                  backgroundColor: "hsl(var(--background))",
                  border: "2px solid hsl(var(--border))",
                  boxShadow: "inset 0 4px 12px hsl(var(--foreground) / 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {/* Reel strip */}
                <motion.div
                  style={{ 
                    y: phase === "slowing" || isWon ? springY : reelY,
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                  }}
                >
                  {reelNames.map((name, i) => (
                    <div
                      key={`${name}-${i}`}
                      className="flex items-center justify-center font-extrabold"
                      style={{
                        height: ITEM_HEIGHT,
                        fontSize: isWon && i === winnerIndex ? 22 : 18,
                        color:
                          isWon && i === winnerIndex
                            ? "hsl(45 90% 50%)"
                            : "hsl(var(--foreground))",
                        transition: "color 0.3s, font-size 0.3s",
                      }}
                    >
                      {name}
                    </div>
                  ))}
                </motion.div>

                {/* Winner glow overlay */}
                {isWon && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none rounded-xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.3, 0] }}
                    transition={{ duration: 0.8, repeat: 3 }}
                    style={{
                      background: "hsl(var(--primary) / 0.15)",
                    }}
                  />
                )}
              </div>
            </div>

            {/* Decorative lights - bottom row */}
            <div className="flex justify-center gap-3 py-2.5 w-full px-4">
              {Array.from({ length: lightCount }).map((_, i) => (
                <LightDot key={`bot-${i}`} index={i + lightCount} isWon={isWon} total={lightCount} />
              ))}
            </div>

            {/* Base / bottom plate */}
            <div
              className="w-full py-3"
              style={{
                background: "linear-gradient(0deg, hsl(var(--muted) / 0.8), hsl(var(--muted) / 0.3))",
                borderTop: "1px solid hsl(var(--border))",
              }}
            >
              <div className="flex justify-center gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="rounded-full"
                    style={{
                      width: 6,
                      height: 6,
                      backgroundColor: "hsl(var(--muted-foreground) / 0.25)",
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Lever arm on the right - clickable */}
        <div
          className="absolute flex flex-col items-center cursor-pointer"
          style={{ right: -28, top: "35%" }}
          onClick={handleSpin}
        >
          {/* Lever rod */}
          <motion.div
            className="flex flex-col items-center origin-bottom"
            animate={{ rotate: leverPulled ? 35 : 0 }}
            transition={{ type: "spring", stiffness: 120, damping: 10 }}
          >
            {/* Lever ball */}
            <motion.div
              className="rounded-full mb-0.5"
              style={{
                width: 20,
                height: 20,
                background: "linear-gradient(135deg, hsl(var(--destructive)), hsl(var(--destructive) / 0.7))",
                boxShadow: "0 2px 6px hsl(var(--destructive) / 0.4)",
              }}
              animate={isWon ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.3, repeat: isWon ? 3 : 0 }}
            />
            {/* Lever shaft */}
            <div
              className="rounded-full"
              style={{
                width: 6,
                height: 50,
                background: "linear-gradient(180deg, hsl(var(--muted-foreground) / 0.5), hsl(var(--muted-foreground) / 0.3))",
              }}
            />
          </motion.div>
          {/* Lever base */}
          <div
            className="rounded-full"
            style={{
              width: 14,
              height: 8,
              backgroundColor: "hsl(var(--muted-foreground) / 0.3)",
            }}
          />
        </div>

        {/* Machine stand/base */}
        <div className="flex justify-center mt-1">
          <div
            className="rounded-b-xl"
            style={{
              width: 200,
              height: 12,
              background: "linear-gradient(180deg, hsl(var(--muted-foreground) / 0.25), hsl(var(--muted-foreground) / 0.1))",
            }}
          />
        </div>
        <div className="flex justify-center">
          <div
            className="rounded-b-lg"
            style={{
              width: 230,
              height: 6,
              background: "linear-gradient(180deg, hsl(var(--muted-foreground) / 0.15), transparent)",
            }}
          />
        </div>
      </div>

      {/* Prize reveal */}
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

      {/* Spin / Continue button */}
      <AnimatePresence mode="wait">
        {phase === "idle" && (
          <motion.button
            key="spin"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ delay: 0.3, type: "spring" }}
            onClick={handleSpin}
            className="mt-4 rounded-full px-10 py-3 text-sm font-black uppercase tracking-widest shadow-lg active:scale-95 transition-transform"
            style={{
              background: "linear-gradient(135deg, hsl(45 90% 55%), hsl(35 95% 45%))",
              color: "hsl(0 0% 100%)",
              boxShadow: "0 4px 20px hsl(45 90% 50% / 0.4)",
            }}
          >
            🎰 Spin
          </motion.button>
        )}
        {false && phase === "idle" && drawingStatus === "pending" && (
          <motion.div
            key="pending"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="mt-4 rounded-full px-10 py-3 text-sm font-black uppercase tracking-widest text-muted-foreground bg-muted"
          >
            🕐 Drawing Soon
          </motion.div>
        )}
        {phase === "done" && (
          <motion.button
            key="continue"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: "spring" }}
            onClick={onContinue}
            className="mt-4 rounded-full bg-primary px-8 py-3 text-sm font-bold text-primary-foreground shadow-md active:scale-95 transition-transform"
          >
            See Last Week's Recap
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
