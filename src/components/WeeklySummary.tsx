import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Check, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import AvatarDisplay from "@/components/AvatarDisplay";
import DrawingReveal from "@/components/DrawingReveal";
import type { AvatarType, AvatarStage } from "@/lib/mock-data";

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

const mockChallengeResults: ChallengeResult[] = [
  { title: "Ask a stranger for a high-five", emoji: "🖐️", completedBy: 1423, totalUsers: 1832, takeRate: 77.6, userCompleted: true },
  { title: "Compliment someone's outfit", emoji: "👗", completedBy: 1201, totalUsers: 1832, takeRate: 65.6, userCompleted: true },
  { title: "Request a discount at a store", emoji: "💰", completedBy: 987, totalUsers: 1832, takeRate: 53.9, userCompleted: false },
  { title: "Sing in public for 10 seconds", emoji: "🎤", completedBy: 734, totalUsers: 1832, takeRate: 40.1, userCompleted: true },
  { title: "Dance in an elevator", emoji: "🕺", completedBy: 612, totalUsers: 1832, takeRate: 33.4, userCompleted: true },
  { title: "Ask for a free coffee", emoji: "☕", completedBy: 498, totalUsers: 1832, takeRate: 27.2, userCompleted: false },
  { title: "Ask to cut in line", emoji: "🚶", completedBy: 345, totalUsers: 1832, takeRate: 18.8, userCompleted: true },
  { title: "Ask for someone's number", emoji: "📱", completedBy: 234, totalUsers: 1832, takeRate: 12.8, userCompleted: false },
];

const mockTopVideos = [
  { username: "brave_sarah", avatar: "dragon" as AvatarType, avatarStage: 3 as AvatarStage, challenge: "Ask a stranger for a high-five", emoji: "🖐️" },
  { username: "rejection_king", avatar: "fox" as AvatarType, avatarStage: 2 as AvatarStage, challenge: "Sing in public for 10 seconds", emoji: "🎤" },
  { username: "fearless_mike", avatar: "owl" as AvatarType, avatarStage: 1 as AvatarStage, challenge: "Dance in an elevator", emoji: "🕺" },
  { username: "courage_queen", avatar: "cat" as AvatarType, avatarStage: 3 as AvatarStage, challenge: "Ask for someone's number", emoji: "📱" },
];

const potAmount = 287;
const playerCount = 52;
const winnerName = "brave_sarah";

export default function WeeklySummary({ onContinue }: WeeklySummaryProps) {
  const [showDrawing, setShowDrawing] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    setTimeout(onContinue, 400);
  }, [onContinue]);

  const handleChallengeClick = (challengeTitle: string) => {
    setDismissed(true);
    setTimeout(() => navigate("/"), 400);
  };

  const handleWatchAll = () => {
    setDismissed(true);
    setTimeout(() => navigate("/"), 400);
  };

  return (
    <>
      {/* Page 1: Drawing animation */}
      <AnimatePresence>
        {showDrawing && (
          <DrawingReveal
            potAmount={potAmount}
            playerCount={playerCount}
            winnerName={winnerName}
            onContinue={() => setShowDrawing(false)}
          />
        )}
      </AnimatePresence>

      {/* Page 2: Recap */}
      <AnimatePresence>
      {!dismissed && !showDrawing && (
        <motion.div
          className="fixed inset-0 z-[60] flex flex-col"
          style={{ backgroundColor: "hsl(var(--background))" }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -300 }}
          transition={{ duration: 0.4 }}
        >
          {/* Scrollable content */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto overscroll-contain"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
          {/* Header */}
          <div className="px-4 pb-4 text-center" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}>
            <motion.h1
              className="text-3xl font-extrabold text-foreground"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
            >
              Last Week's Recap
            </motion.h1>
          </div>


          {/* Challenge Take Rates */}
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
              {mockChallengeResults.map((challenge, i) => (
                <motion.button
                  key={challenge.title}
                  onClick={() => handleChallengeClick(challenge.title)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 w-full text-left transition-colors active:bg-muted/50",
                    i !== mockChallengeResults.length - 1 && "border-b border-border/50",
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
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                  </div>
                </motion.button>
              ))}
            </motion.div>
          </div>

          {/* Top Videos Gallery */}
          <div className="px-4 mt-4 mb-6">
            <motion.div
              className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <div className="px-4 py-3 border-b border-border">
                <h2 className="text-sm font-bold text-foreground">🔥 Top Videos This Week</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 p-3">
                {mockTopVideos.map((video, i) => (
                  <motion.button
                    key={video.username}
                    className="rounded-xl border border-border/50 overflow-hidden text-left bg-muted/30"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.9 + i * 0.1, type: "spring" }}
                    onClick={() => handleWatchAll()}
                  >
                    {/* 9:16 tall thumbnail */}
                    <div
                      className="aspect-[9/16] relative flex items-center justify-center"
                      style={{ backgroundColor: 'hsl(var(--muted))' }}
                    >
                      <span className="text-4xl">{video.emoji}</span>
                    </div>
                    {/* User info */}
                    <div className="p-2.5 flex items-center gap-2">
                      <AvatarDisplay avatar={video.avatar} stage={video.avatarStage} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{video.username}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{video.challenge}</p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Watch all videos button */}
              <div className="px-3 pb-3">
                <button
                  onClick={handleWatchAll}
                  className="w-full rounded-xl border border-border py-2.5 text-sm font-semibold text-foreground transition-colors active:bg-muted/50"
                >
                  Watch all videos
                </button>
              </div>
            </motion.div>
          </div>

          {/* Spacer for button */}
          <div className="h-32" />
          </div>

          {/* Continue button - fixed at bottom */}
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
