import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Crown, Trophy, Upload, Users, Video, FolderOpen, RotateCcw, Box } from "lucide-react";
import { cn } from "@/lib/utils";
import { mockChallenges, getCompletedCount, getTimeUntilSunday, getCurrentWeekKey, type Challenge } from "@/lib/mock-data";
import { fireConfetti, fireBigConfetti, fireEpicConfetti } from "@/lib/confetti";
import { playPop, playBigWin, playEpicWin, playCascade } from "@/lib/sounds";
import { toast } from "@/hooks/use-toast";
import CameraRecorder from "@/components/CameraRecorder";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import WeeklySummary from "@/components/WeeklySummary";
import DropReveal from "@/components/DropReveal";

const progressMessages: Record<number, string> = {
  1: "Great start!",
  2: "Keep going...",
  3: "Over halfway!",
  4: "One more to go!",
  5: "🔥 Goal reached!",
  6: "Going above & beyond!",
  7: "On fire!",
  8: "🏆 LEGEND!",
};

function CountdownDigit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-2xl font-extrabold text-foreground tabular-nums leading-none">
        {String(value).padStart(2, "0")}
      </span>
      <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export default function Challenges() {
  const navigate = useNavigate();
  const { user, profile, setProfile } = useAuth();
  const weekKey = getCurrentWeekKey();
  const [dropRevealed, setDropRevealed] = useState(() => localStorage.getItem(weekKey) === "true");
  const [summaryDone, setSummaryDone] = useState(() => localStorage.getItem(weekKey) === "true");
  const [justRevealed, setJustRevealed] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>(() => {
    const saved = localStorage.getItem(`${weekKey}-completed`);
    if (saved) {
      const completedIds: string[] = JSON.parse(saved);
      return mockChallenges.map(c => ({ ...c, completed: completedIds.includes(c.id) }));
    }
    return mockChallenges;
  });
  const [choiceChallenge, setChoiceChallenge] = useState<Challenge | null>(null);
  const [cameraChallenge, setCameraChallenge] = useState<Challenge | null>(null);
  
  const [pendingUncheck, setPendingUncheck] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(getTimeUntilSunday);

  // Persist completed challenges to localStorage + sync to DB
  useEffect(() => {
    const completedIds = challenges.filter(c => c.completed).map(c => c.id);
    localStorage.setItem(`${weekKey}-completed`, JSON.stringify(completedIds));

    // Sync total completed this week to the profile in DB
    if (user) {
      const count = completedIds.length;
      supabase
        .from("profiles")
        .update({ total_completed: count })
        .eq("id", user.id)
        .then(() => {
          if (profile) {
            setProfile({ ...profile, total_completed: count });
          }
        });
    }
  }, [challenges, weekKey]);

  // Live countdown tick
  useEffect(() => {
    const timer = setInterval(() => setCountdown(getTimeUntilSunday()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isPremium = true;

  const triggerSubscribe = () => {
    // TODO: Replace with native IAP call via Capacitor plugin
    // No-op for now — native StoreKit will handle this
  };
  const completed = getCompletedCount(challenges);
  const prizePool = 1247;
  const subscribers = 1832;

  const handleRevealComplete = () => {
    localStorage.setItem(weekKey, "true");
    setDropRevealed(true);
    setJustRevealed(true);
    playCascade(10, 900);
    setTimeout(() => setJustRevealed(false), 2500);
  };

  const handleChallengeClick = (id: string) => {
    const challenge = challenges.find((c) => c.id === id);
    if (!challenge) return;
    if (challenge.completed) {
      setPendingUncheck(id);
      return;
    }
    doToggle(id);
  };

  const doToggle = (id: string) => {
    setChallenges((prev) => {
      const challenge = prev.find((c) => c.id === id);
      if (!challenge) return prev;
      const next = prev.map((c) =>
        c.id === id ? { ...c, completed: !c.completed } : c
      );
      if (!challenge.completed) {
        const newCount = getCompletedCount(next);
        if (newCount === 8) {
          fireEpicConfetti();
          playEpicWin();
          if (navigator.vibrate) navigator.vibrate([200, 80, 200, 80, 200, 80, 400]);
        } else if (newCount >= 5) {
          fireBigConfetti();
          playBigWin();
          if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
        } else {
          fireConfetti();
          playPop();
          if (navigator.vibrate) navigator.vibrate(50);
        }
      }
      return next;
    });
  };

  const progressPct = Math.min((completed / 5) * 100, 100);

  return (
    <>
      <AnimatePresence>
        {!summaryDone && <WeeklySummary onContinue={() => setSummaryDone(true)} />}
      </AnimatePresence>
      <AnimatePresence>
        {summaryDone && !dropRevealed && <DropReveal onRevealComplete={handleRevealComplete} />}
      </AnimatePresence>

      <div className="min-h-screen pb-24 pt-14">
        <div className="mx-auto max-w-lg px-4">

          {/* Countdown */}
          <div data-tour="countdown" className="mb-8 text-center">
            <p className="text-lg font-extrabold text-foreground">Time Left Until the Next Drawing</p>
            <p className="text-sm text-muted-foreground mb-4">Deadline Sunday @ Midnight</p>
            <div className="flex items-center justify-center gap-4">
              <CountdownDigit value={countdown.days} label="Days" />
              <span className="text-xl font-bold text-muted-foreground/30 -mt-3">:</span>
              <CountdownDigit value={countdown.hours} label="Hours" />
              <span className="text-xl font-bold text-muted-foreground/30 -mt-3">:</span>
              <CountdownDigit value={countdown.minutes} label="Min" />
            </div>
          </div>

          {/* Premium Cards */}
          <div data-tour="prize-pool" className="flex gap-2.5 mb-8">
            {/* Subscribers */}
            {isPremium ? (
                <div data-tour="subscribers-card" className="flex-1 rounded-xl border-2 border-foreground bg-card px-4 py-3.5 text-foreground relative overflow-hidden shadow-[3px_3px_0px_0px_hsl(var(--foreground))]">
                <p className="text-3xl font-bold tracking-tight">{subscribers.toLocaleString()}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs font-semibold text-muted-foreground">Players</p>
                </div>
              </div>
            ) : (
              <button
                onClick={triggerSubscribe}
                className="flex-1 rounded-xl border-2 border-foreground bg-card px-4 py-3.5 text-foreground text-left relative overflow-hidden shadow-[3px_3px_0px_0px_hsl(var(--foreground))]"
              >
                <div className="h-8"><p className="text-3xl font-bold tracking-tight blur-md select-none">1,832</p></div>
                <div className="flex items-center gap-1.5 mt-1">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs font-semibold text-muted-foreground">Subscribers</p>
                </div>
                <Crown className="absolute top-3.5 right-3.5 h-3.5 w-3.5 text-muted-foreground/40" />
              </button>
            )}

            {/* Prize Pool */}
            {isPremium ? (
              <div data-tour="prize-pool-card" className="flex-1 rounded-xl border-2 border-foreground bg-card px-4 py-3.5 text-foreground relative overflow-hidden shadow-[3px_3px_0px_0px_hsl(var(--foreground))]">
                <p className="text-3xl font-bold tracking-tight">${prizePool.toLocaleString()}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Trophy className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs font-semibold text-muted-foreground">Prize Pool</p>
                </div>
              </div>
            ) : (
              <button
                onClick={triggerSubscribe}
                className="flex-1 rounded-xl border-2 border-foreground bg-card px-4 py-3.5 text-foreground text-left relative overflow-hidden shadow-[3px_3px_0px_0px_hsl(var(--foreground))]"
              >
                <div className="h-8"><p className="text-3xl font-bold tracking-tight blur-md select-none">$1,247</p></div>
                <div className="flex items-center gap-1.5 mt-1">
                  <Trophy className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs font-semibold text-muted-foreground">Prize Pool</p>
                </div>
                <Crown className="absolute top-3.5 right-3.5 h-3.5 w-3.5 text-muted-foreground/40" />
              </button>
            )}
          </div>

          {/* Progress */}
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">
                {completed}/5 completed
              </span>
              <span className="text-xs font-semibold text-primary">
                {progressMessages[completed] || ""}
              </span>
            </div>
            <div className="h-4 rounded-full border-2 border-foreground/10 bg-muted overflow-hidden shadow-[2px_2px_0px_0px_hsl(var(--foreground)/0.06)]">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={false}
                animate={{ width: `${progressPct}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              />
            </div>
          </div>

          {/* Challenge List */}
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Complete 5 of 8 challenges
          </p>
          <div data-tour="challenge-list" className="space-y-2">
            <AnimatePresence>
              {challenges.map((challenge, i) => (
                <motion.div
                  key={challenge.id}
                  initial={justRevealed ? { opacity: 0, y: -200, scale: 0.6, rotate: -8 } : false}
                  animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 }}
                  transition={justRevealed
                    ? { delay: i * 0.12, type: "spring", stiffness: 300, damping: 18 }
                    : { duration: 0 }
                  }
                  className={cn(
                    "group flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all",
                    challenge.completed
                      ? "border-primary/30 bg-primary/5 shadow-[2px_2px_0px_0px_hsl(var(--primary)/0.2)]"
                      : "border-foreground/10 bg-card shadow-[2px_2px_0px_0px_hsl(var(--foreground)/0.06)]"
                  )}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => handleChallengeClick(challenge.id)}
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all",
                      challenge.completed
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "border-2 border-muted-foreground/30 text-muted-foreground"
                    )}
                  >
                    {challenge.completed ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                  </button>

                  {/* Title */}
                  <button
                    onClick={() => handleChallengeClick(challenge.id)}
                    className={cn(
                      "flex-1 text-left text-sm font-medium",
                      challenge.completed
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    )}
                  >
                    {challenge.title}
                    <span className="ml-1.5">{challenge.emoji}</span>
                  </button>

                  {/* Upload */}
                  <button
                    {...(i === 0 ? { "data-tour": "upload-btn" } : {})}
                    onClick={() => isPremium ? setChoiceChallenge(challenge) : triggerSubscribe()}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                      challenge.completed
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isPremium ? (
                      <Upload className="h-3.5 w-3.5" />
                    ) : (
                      <Crown className="h-3.5 w-3.5" />
                    )}
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Choice modal: Record or Upload */}
        <AnimatePresence>
          {choiceChallenge && !cameraChallenge && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
              onClick={() => setChoiceChallenge(null)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg rounded-t-2xl bg-card p-5 pb-10"
              >
                <p className="mb-1 text-lg font-bold text-foreground">Add Accountability Video</p>
                <p className="mb-5 text-sm text-muted-foreground">{choiceChallenge.title}</p>

                <button
                  onClick={() => {
                    setCameraChallenge(choiceChallenge);
                    setChoiceChallenge(null);
                  }}
                  className="mb-3 flex w-full items-center gap-3 rounded-xl border bg-muted/30 px-4 py-4 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Video className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Record Now</p>
                    <p className="text-xs text-muted-foreground">Film directly in the app</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setChoiceChallenge(null);
                    navigate("/post", { state: { challengeTitle: choiceChallenge.title } });
                  }}
                  className="mb-3 flex w-full items-center gap-3 rounded-xl border bg-muted/30 px-4 py-4 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <FolderOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Upload from Library</p>
                    <p className="text-xs text-muted-foreground">Choose a video from your camera roll</p>
                  </div>
                </button>

                <button
                  onClick={() => setChoiceChallenge(null)}
                  className="mt-1 w-full py-2 text-sm text-muted-foreground"
                >
                  Cancel
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Full-screen camera recorder */}
        <AnimatePresence>
          {cameraChallenge && (
            <CameraRecorder
              challengeTitle={cameraChallenge.title}
              onClose={() => setCameraChallenge(null)}
              onRecorded={(file) => {
                doToggle(cameraChallenge.id);
                setCameraChallenge(null);
                navigate("/post", { state: { challengeTitle: cameraChallenge.title, recordedFile: file.name } });
              }}
            />
          )}
        </AnimatePresence>

        {/* Undo confirmation */}
        <AnimatePresence>
          {pendingUncheck && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
              onClick={() => setPendingUncheck(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ type: "spring", damping: 25, stiffness: 400 }}
                onClick={(e) => e.stopPropagation()}
                className="w-72 overflow-hidden rounded-2xl bg-card shadow-xl"
              >
                <div className="px-6 pt-6 pb-4 text-center">
                  <p className="text-base font-semibold text-foreground">Mark as incomplete?</p>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    You can always redo it later.
                  </p>
                </div>
                <div className="border-t border-border flex">
                  <button
                    onClick={() => setPendingUncheck(null)}
                    className="flex-1 py-3 text-sm font-medium text-primary border-r border-border"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      doToggle(pendingUncheck);
                      setPendingUncheck(null);
                    }}
                    className="flex-1 py-3 text-sm font-semibold text-destructive"
                  >
                    Yes, Undo
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </>
  );
}
