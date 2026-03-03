import { useState, useRef } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { Trophy, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import AvatarDisplay from "@/components/AvatarDisplay";
import type { AvatarType, AvatarStage } from "@/lib/mock-data";

interface ChallengeResult {
  title: string;
  emoji: string;
  completedBy: number;
  totalUsers: number;
  takeRate: number;
}

interface WeeklySummaryProps {
  onContinue: () => void;
}

// Mock data for last week's results
const mockChallengeResults: ChallengeResult[] = [
  { title: "Ask a stranger for a high-five", emoji: "🖐️", completedBy: 1423, totalUsers: 1832, takeRate: 77.6 },
  { title: "Compliment someone's outfit", emoji: "👗", completedBy: 1201, totalUsers: 1832, takeRate: 65.6 },
  { title: "Request a discount at a store", emoji: "💰", completedBy: 987, totalUsers: 1832, takeRate: 53.9 },
  { title: "Sing in public for 10 seconds", emoji: "🎤", completedBy: 734, totalUsers: 1832, takeRate: 40.1 },
  { title: "Dance in an elevator", emoji: "🕺", completedBy: 612, totalUsers: 1832, takeRate: 33.4 },
  { title: "Ask for a free coffee", emoji: "☕", completedBy: 498, totalUsers: 1832, takeRate: 27.2 },
  { title: "Ask to cut in line", emoji: "🚶", completedBy: 345, totalUsers: 1832, takeRate: 18.8 },
  { title: "Ask for someone's number", emoji: "📱", completedBy: 234, totalUsers: 1832, takeRate: 12.8 },
];

const mockTopVideos = [
  { username: "brave_sarah", avatar: "dragon" as AvatarType, avatarStage: 3 as AvatarStage, challenge: "Ask a stranger for a high-five", emoji: "🖐️" },
  { username: "rejection_king", avatar: "fox" as AvatarType, avatarStage: 2 as AvatarStage, challenge: "Sing in public for 10 seconds", emoji: "🎤" },
  { username: "fearless_mike", avatar: "owl" as AvatarType, avatarStage: 1 as AvatarStage, challenge: "Dance in an elevator", emoji: "🕺" },
  { username: "courage_queen", avatar: "cat" as AvatarType, avatarStage: 3 as AvatarStage, challenge: "Ask for someone's number", emoji: "📱" },
];

const completedThreshold = 5;
const totalQualified = 892;
const totalUsers = 1832;
const qualifiedPercent = Math.round((totalQualified / totalUsers) * 100);

export default function WeeklySummary({ onContinue }: WeeklySummaryProps) {
  const [dismissed, setDismissed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, -200], [1, 0]);

  const handleDragEnd = (_: any, info: { offset: { y: number }; velocity: { y: number } }) => {
    if (info.offset.y < -80 || info.velocity.y < -300) {
      setDismissed(true);
      setTimeout(onContinue, 400);
    }
  };

  const youQualified = true;

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          ref={containerRef}
          className="fixed inset-0 z-[60] flex flex-col overflow-y-auto"
          style={{
            background: `linear-gradient(
              135deg,
              hsl(164 72% 92%) 0%,
              hsl(180 40% 96%) 25%,
              hsl(200 30% 95%) 50%,
              hsl(164 50% 94%) 75%,
              hsl(140 40% 95%) 100%
            )`,
            backgroundAttachment: "fixed",
            y,
            opacity,
          }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.6, bottom: 0.1 }}
          onDragEnd={handleDragEnd}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -300 }}
          transition={{ duration: 0.4 }}
        >
          {/* Header */}
          <div className="px-4 pt-12 pb-4 text-center">
            <motion.h1
              className="text-3xl font-extrabold text-foreground"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: "spring" }}
            >
              Last Week's Recap
            </motion.h1>

            {/* Qualified banner */}
            {youQualified && (
              <motion.div
                className="mx-auto mt-4 flex items-center gap-2 rounded-full px-4 py-2 w-fit"
                style={{ backgroundColor: 'hsl(43 96% 80%)' }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
              >
                <Trophy className="h-4 w-4" style={{ color: 'hsl(43 80% 35%)' }} />
                <span className="text-sm font-bold" style={{ color: 'hsl(43 80% 25%)' }}>You qualified for the prize pool!</span>
              </motion.div>
            )}
          </div>

          {/* Qualification stat */}
          <div className="px-4">
            <motion.div
              className="rounded-2xl border border-border bg-card shadow-sm px-4 py-3 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <p className="text-sm font-semibold text-foreground">{qualifiedPercent}% of users completed 5+ challenges</p>
            </motion.div>
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
                <motion.div
                  key={challenge.title}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5",
                    i !== mockChallengeResults.length - 1 && "border-b border-border/50"
                  )}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.05 }}
                >
                  <span className="text-lg w-8 text-center">{challenge.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground/70 truncate">{challenge.title}</p>
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
                  <span className="text-xs font-bold text-muted-foreground w-12 text-right">
                    {challenge.takeRate}%
                  </span>
                </motion.div>
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
                  >
                    {/* Video thumbnail placeholder */}
                    <div
                      className="aspect-[4/5] relative flex items-center justify-center"
                      style={{ backgroundColor: 'hsl(164 72% 92%)' }}
                    >
                      <span className="text-4xl">{video.emoji}</span>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-10 w-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center shadow-md">
                          <Play className="h-4 w-4 text-foreground ml-0.5" fill="currentColor" />
                        </div>
                      </div>
                    </div>
                    {/* User info */}
                    <div className="p-3 flex items-center gap-2">
                      <AvatarDisplay avatar={video.avatar} stage={video.avatarStage} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{video.username}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{video.challenge}</p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Continue button */}
          <div className="sticky bottom-0 pb-8 pt-4 flex flex-col items-center"
            style={{
              background: "linear-gradient(0deg, hsl(164 72% 92%) 60%, transparent 100%)",
            }}
          >
            <button
              onClick={() => { setDismissed(true); setTimeout(onContinue, 400); }}
              className="rounded-full bg-primary px-8 py-3 text-sm font-bold text-primary-foreground shadow-md active:scale-95 transition-transform"
            >
              See This Week's Challenges
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
