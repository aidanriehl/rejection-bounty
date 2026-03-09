import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DrawingReveal from "@/components/DrawingReveal";

interface ChallengeResult {
  title: string;
  emoji: string;
  completedBy: number;
  totalUsers: number;
  takeRate: number;
  userCompleted: boolean;
}

interface WeeklySummaryProps {
  onContinue: () => void;
}

function getPreviousWeekKey(): string {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  const prevWeekNum = weekNum - 1;
  if (prevWeekNum > 0) return `${now.getFullYear()}-w${prevWeekNum}`;
  return `${now.getFullYear() - 1}-w52`;
}

type FlowPhase = "drawing" | "recap";

export default function WeeklySummary({ onContinue }: WeeklySummaryProps) {
  const [phase, setPhase] = useState<FlowPhase>("drawing");
  const [dismissed, setDismissed] = useState(false);
  const [challengeResults, setChallengeResults] = useState<ChallengeResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fetch real data for previous week
  useEffect(() => {
    const fetchRecapData = async () => {
      setLoadingResults(true);
      const prevWeekKey = getPreviousWeekKey();

      // Fetch challenges for previous week
      const { data: challenges } = await supabase
        .from("challenges")
        .select("id, title, emoji")
        .eq("week_key", prevWeekKey)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (!challenges || challenges.length === 0) {
        setChallengeResults([]);
        setLoadingResults(false);
        return;
      }

      // Fetch all completions for previous week
      const { data: completions } = await supabase
        .from("challenge_completions")
        .select("challenge_id, user_id")
        .eq("week_key", prevWeekKey);

      // Count unique users who participated
      const uniqueUsers = new Set((completions || []).map(c => c.user_id));
      const totalUsers = Math.max(uniqueUsers.size, 1);

      // Get current user's completions
      const { data: { user } } = await supabase.auth.getUser();
      const userCompletedIds = new Set(
        (completions || [])
          .filter(c => c.user_id === user?.id)
          .map(c => c.challenge_id)
      );

      // Build results
      const results: ChallengeResult[] = challenges.map(ch => {
        const completedBy = (completions || []).filter(c => c.challenge_id === ch.id).length;
        const takeRate = Math.round((completedBy / totalUsers) * 1000) / 10;
        return {
          title: ch.title,
          emoji: ch.emoji,
          completedBy,
          totalUsers,
          takeRate,
          userCompleted: userCompletedIds.has(ch.id),
        };
      });

      // Sort by take rate descending
      results.sort((a, b) => b.takeRate - a.takeRate);
      setChallengeResults(results);
      setLoadingResults(false);
    };

    fetchRecapData();
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    setTimeout(onContinue, 400);
  }, [onContinue]);

  return (
    <>
      {/* Phase 1: Drawing + winning video (inline crossfade) */}
      <AnimatePresence>
        {phase === "drawing" && (
          <DrawingReveal
            potAmount={0}
            playerCount={0}
            winnerName=""
            winningVideoId={null}
            winningChallenge=""
            winningEmoji=""
            onContinue={() => setPhase("recap")}
          />
        )}
      </AnimatePresence>

      {/* Phase 2: Recap */}
      <AnimatePresence>
      {!dismissed && phase === "recap" && (
        <motion.div
          className="fixed inset-0 z-[60] flex flex-col"
          style={{
            backgroundColor: "hsl(var(--background))",
            paddingTop: "env(safe-area-inset-top)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -300 }}
          transition={{ duration: 0.4 }}
        >
          <div
            ref={scrollRef}
            data-scroll-container
            className="flex-1 overflow-y-auto overscroll-contain"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
          <div className="px-4 pb-4 pt-12 text-center">
            <motion.h1
              className="text-3xl font-extrabold text-foreground"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
            >
              Last Week's Recap
            </motion.h1>
          </div>

          {loadingResults ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : challengeResults.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-muted-foreground">No challenge data from last week.</p>
            </div>
          ) : (
            <div className="px-4 mt-4">
              <motion.div
                className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="px-4 py-3 border-b border-border">
                  <h2 className="text-sm font-bold text-foreground">Group Take Rates</h2>
                </div>
                {challengeResults.map((challenge, i) => (
                  <motion.div
                    key={challenge.title}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 w-full text-left",
                      i !== challengeResults.length - 1 && "border-b border-border/50",
                      challenge.userCompleted && "bg-primary/5"
                    )}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                  >
                    <div className="relative w-8 text-center">
                      <span className="text-lg">{challenge.emoji}</span>
                      {challenge.userCompleted && (
                        <div className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary">
                          <Check className="h-2 w-2 text-primary-foreground" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-xs font-medium truncate",
                        challenge.userCompleted ? "text-foreground" : "text-foreground/70"
                      )}>{challenge.title}</p>
                      <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            background: challenge.takeRate > 50
                              ? "hsl(var(--success))"
                              : challenge.takeRate > 25
                              ? "hsl(var(--gold))"
                              : "hsl(var(--destructive))",
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${challenge.takeRate}%` }}
                          transition={{ delay: 0.7 + i * 0.05, duration: 0.6, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-muted-foreground w-12 text-right">
                        {challenge.takeRate}%
                      </span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )}

          <div className="h-32" />
          </div>

          <div className="absolute bottom-0 left-0 right-0 pt-8 flex flex-col items-center"
            style={{
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)',
              background: "linear-gradient(0deg, hsl(var(--background)) 70%, transparent 100%)",
            }}
          >
            <button
              onClick={handleDismiss}
              className="rounded-full bg-primary px-8 py-3 text-sm font-bold text-primary-foreground shadow-md active:scale-95 transition-transform"
            >
              See This Week's Challenges
            </button>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </>
  );
}
