import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Crown, Trophy, Upload, Users, RotateCcw, Video, FolderOpen, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { mockChallenges, getCompletedCount, getTimeUntilSunday, getCurrentWeekKey, type Challenge } from "@/lib/mock-data";
import { fireConfetti, fireBigConfetti, fireEpicConfetti } from "@/lib/confetti";
import { playPop, playBigWin, playEpicWin, playCascade, playBrickLand } from "@/lib/sounds";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import WeeklySummary from "@/components/WeeklySummary";
import CameraRecorder from "@/components/CameraRecorder";

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
      <span className="text-4xl font-extrabold text-foreground tabular-nums leading-none">
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
  const [dropRevealed] = useState(true);
  const [summaryDone, setSummaryDone] = useState(() => localStorage.getItem(`${weekKey}-summary`) === "true" || localStorage.getItem("tour_pending") === "true");

  // Persist summary dismissal
  const dismissSummary = () => {
    localStorage.setItem(`${weekKey}-summary`, "true");
    setSummaryDone(true);
  };
  const [showcaseDone, setShowcaseDone] = useState(() => localStorage.getItem(`${weekKey}-showcase`) === "true");
  const [justRevealed, setJustRevealed] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(true);

  const [pendingUncheck, setPendingUncheck] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(getTimeUntilSunday);
  const [choiceChallenge, setChoiceChallenge] = useState<Challenge | null>(null);
  const [cameraChallenge, setCameraChallenge] = useState<Challenge | null>(null);
  const libraryFileRef = useRef<HTMLInputElement>(null);
  const [subscribers, setSubscribers] = useState<number>(0);
  const [prizePool, setPrizePool] = useState<number>(0);
  const [ticketCount, setTicketCount] = useState<number | null>(null);

  // Fetch challenges from database based on current week
  useEffect(() => {
    const fetchChallenges = async () => {
      setLoadingChallenges(true);

      // Fetch challenges for this week from database
      const { data: dbChallenges, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("week_key", weekKey)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Failed to fetch challenges:", error);
        // Fallback to mock challenges if DB fails
        setChallenges(mockChallenges);
        setLoadingChallenges(false);
        return;
      }

      // If no challenges in DB for this week, use mock challenges
      if (!dbChallenges || dbChallenges.length === 0) {
        console.log("No challenges in DB for week", weekKey, "- using mock challenges");
        const saved = localStorage.getItem(`${weekKey}-completed`);
        if (saved) {
          const completedIds: string[] = JSON.parse(saved);
          setChallenges(mockChallenges.map(c => ({ ...c, completed: completedIds.includes(c.id) })));
        } else {
          setChallenges(mockChallenges);
        }
        setLoadingChallenges(false);
        return;
      }

      // Fetch user's completions for this week
      let completedIds: string[] = [];
      if (user) {
        const { data: completions } = await supabase
          .from("challenge_completions")
          .select("challenge_id")
          .eq("user_id", user.id)
          .eq("week_key", weekKey);

        completedIds = (completions || []).map((c: any) => c.challenge_id);
      }

      // Map DB challenges to Challenge type with completion status
      const mappedChallenges: Challenge[] = dbChallenges.map((ch: any) => ({
        id: ch.id,
        title: ch.title,
        description: ch.description || ch.title,
        emoji: ch.emoji,
        completed: completedIds.includes(ch.id),
        hasVideo: false,
      }));

      setChallenges(mappedChallenges);
      setLoadingChallenges(false);
    };

    fetchChallenges();
  }, [weekKey, user]);

  // Persist completed challenges to localStorage + sync to DB
  useEffect(() => {
    if (loadingChallenges || challenges.length === 0) return;

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
  }, [challenges, weekKey, loadingChallenges]);

  // Live countdown tick
  useEffect(() => {
    const timer = setInterval(() => setCountdown(getTimeUntilSunday()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch real subscriber count and calculate prize pool
  useEffect(() => {
    const fetchSubscribers = async () => {
      const { count, error } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      if (error) {
        console.error("Failed to fetch subscribers:", error);
        return;
      }

      const subCount = count ?? 0;
      setSubscribers(subCount);
      // Prize pool = subscribers × $3.50, divided by 4 weeks per month
      setPrizePool(Math.round((subCount * 3.5) / 4));
    };

    fetchSubscribers();
  }, []);

  // Fetch ticket count for this week
  const fetchTickets = async () => {
    if (!user) return;
    const { data, error } = await supabase.rpc("calculate_tickets", { p_week_key: weekKey });
    if (error) {
      console.error("Failed to fetch tickets:", error);
      return;
    }
    const userTickets = (data as any[])?.find((t: any) => t.user_id === user.id);
    setTicketCount(userTickets?.tickets ?? 0);
  };

  useEffect(() => {
    fetchTickets();
  }, [user, weekKey]);

  // Listen for challenge completion from upload
  useEffect(() => {
    const handleUploadComplete = (e: CustomEvent<{ challengeId: string }>) => {
      const { challengeId } = e.detail;
      setChallenges((prev) => {
        const challenge = prev.find((c) => c.id === challengeId);
        if (!challenge || challenge.completed) return prev;

        const next = prev.map((c) =>
          c.id === challengeId ? { ...c, completed: true } : c
        );

        // Trigger celebration
        const newCount = getCompletedCount(next);
        setTimeout(() => {
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
        }, 300);

        return next;
      });

      // Refresh ticket count after upload
      setTimeout(fetchTickets, 2000);
    };

    window.addEventListener("challenge-completed", handleUploadComplete as EventListener);
    return () => window.removeEventListener("challenge-completed", handleUploadComplete as EventListener);
  }, []);

  const isPremium = true;

  const triggerSubscribe = () => {
    // TODO: Replace with native IAP call via Capacitor plugin
    // No-op for now — native StoreKit will handle this
  };
  const completed = getCompletedCount(challenges);

  const handleRevealComplete = () => {
    localStorage.setItem(weekKey, "true");
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

  const doToggle = async (id: string) => {
    const challenge = challenges.find((c) => c.id === id);
    if (!challenge) return;

    const newCompleted = !challenge.completed;

    // Update local state immediately
    setChallenges((prev) => {
      const next = prev.map((c) =>
        c.id === id ? { ...c, completed: newCompleted } : c
      );
      if (newCompleted) {
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

    // Sync to database
    if (user) {
      if (newCompleted) {
        // Add completion record
        await supabase
          .from("challenge_completions")
          .upsert({
            user_id: user.id,
            challenge_id: id,
            week_key: weekKey,
          }, { onConflict: "user_id,challenge_id,week_key" });
      } else {
        // Remove completion record
        await supabase
          .from("challenge_completions")
          .delete()
          .eq("user_id", user.id)
          .eq("challenge_id", id)
          .eq("week_key", weekKey);
      }
    }
  };

  const progressPct = Math.min((completed / 5) * 100, 100);

  return (
    <>
      <AnimatePresence>
        {!summaryDone && <WeeklySummary onContinue={dismissSummary} />}
      </AnimatePresence>

      <div className="min-h-screen pb-24 pt-4">
        <div className="mx-auto max-w-lg px-4">

          {/* Recap icon - top right */}
          <div className="flex justify-end mb-2">
            <button
              onClick={() => setSummaryDone(false)}
              className="flex items-center justify-center rounded-full h-8 w-8 text-muted-foreground transition-colors hover:bg-muted"
              aria-label="View last week recap"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          {/* Countdown */}
          <div data-tour="countdown" className="mb-6 text-center">
            <p className="text-lg font-extrabold text-foreground">Time Left Until Next Drawing</p>
            <p className="text-sm text-muted-foreground mb-3 -mt-0.5">Deadline Sunday @ Midnight</p>
            <div className="flex items-center justify-center gap-2">
              <CountdownDigit value={countdown.days} label="Days" />
              <span className="text-2xl font-bold text-muted-foreground/30 -mt-3">:</span>
              <CountdownDigit value={countdown.hours} label="Hours" />
              <span className="text-2xl font-bold text-muted-foreground/30 -mt-3">:</span>
              <CountdownDigit value={countdown.minutes} label="Min" />
            </div>
          </div>

          {/* Premium Cards */}
          <div data-tour="prize-pool" className="flex justify-center gap-4 mb-8 max-w-xs mx-auto">
            {/* Subscribers */}
            {isPremium ? (
                <div data-tour="subscribers-card" className="flex-1 rounded-xl border-2 border-foreground bg-card px-4 py-3.5 text-foreground relative overflow-hidden shadow-[3px_3px_0px_0px_hsl(var(--foreground))]">
                <p className="text-2xl font-bold tracking-tight">#{subscribers.toLocaleString()}</p>
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
                <div className="h-7"><p className="text-2xl font-bold tracking-tight blur-md select-none">1,832</p></div>
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
                <p className="text-2xl font-bold tracking-tight">${prizePool.toLocaleString()}</p>
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
                <div className="h-7"><p className="text-2xl font-bold tracking-tight blur-md select-none">$1,247</p></div>
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
            {ticketCount !== null && ticketCount > 0 && (
              <p className="mt-2 text-xs font-medium text-muted-foreground">
                🎟️ {ticketCount} {ticketCount === 1 ? "entry" : "entries"} in this week's draw
              </p>
            )}
          </div>

          {/* Challenge List */}
          <div data-tour="challenge-list">
            <p className="mb-2 text-sm font-bold text-foreground">
              Complete 5 of 8 challenges
            </p>
            <div className="space-y-2">
            {loadingChallenges ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
            <AnimatePresence>
              {dropRevealed && challenges.map((challenge, i) => (
                <motion.div
                  key={challenge.id}
                  initial={justRevealed ? { opacity: 0, y: -300, scale: 0.3 } : false}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={justRevealed
                    ? { delay: i * 0.18, type: "spring", stiffness: 350, damping: 22 }
                    : { duration: 0 }
                  }
                  onAnimationComplete={() => {
                    if (justRevealed) playBrickLand(i);
                  }}
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
                    onClick={() => isPremium ? navigate("/post", { state: { challengeTitle: challenge.title, challengeId: challenge.id } }) : triggerSubscribe()}
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
            )}
            </div>
          </div>
        </div>

        {/* Hidden file input for Photo Library */}
        <input
          ref={libraryFileRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file || !choiceChallenge) return;
            // Store file temporarily for Post page to pick up
            (window as any).__pendingVideoFile = file;
            const title = choiceChallenge.title;
            const id = choiceChallenge.id;
            setChoiceChallenge(null);
            navigate("/post", { state: { challengeTitle: title, challengeId: id, fromLibrary: true } });
            if (libraryFileRef.current) libraryFileRef.current.value = "";
          }}
        />

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
                    <p className="text-sm font-semibold text-foreground">Take Video</p>
                    <p className="text-xs text-muted-foreground">Film directly in the app</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setChoiceChallenge(null);
                    navigate("/post", { state: { challengeTitle: choiceChallenge.title, challengeId: choiceChallenge.id } });
                  }}
                  className="mb-3 flex w-full items-center gap-3 rounded-xl border bg-muted/30 px-4 py-4 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <FolderOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Photo Library</p>
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
