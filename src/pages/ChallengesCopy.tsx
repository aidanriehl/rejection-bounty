import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Trophy, Upload, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTimeUntilSunday } from "@/lib/mock-data";

const progressMessages: Record<number, string> = {
  1: "Great start!",
  2: "Keep going...",
  3: "Over halfway!",
  4: "One more to go!",
  5: "Goal reached!",
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

interface MockChallenge {
  id: string;
  title: string;
  emoji: string;
  completed: boolean;
}

// Mock challenges for App Store preview
const MOCK_CHALLENGES: MockChallenge[] = [
  { id: "1", title: "Film yourself vlogging out loud in a public place", emoji: "🎥", completed: true },
  { id: "2", title: "Compliment a stranger in passing", emoji: "💬", completed: true },
  { id: "3", title: "Ask for a discount at a store", emoji: "🏷️", completed: false },
  { id: "4", title: "Give a random person a high five in passing", emoji: "✋", completed: false },
  { id: "5", title: "Film yourself doing pushups in public", emoji: "💪", completed: false },
  { id: "6", title: "Ask someone for directions you don't need", emoji: "🗺️", completed: false },
  { id: "7", title: "Strike up a conversation with someone in line", emoji: "🗣️", completed: false },
  { id: "8", title: "Ask a stranger to take your photo", emoji: "📸", completed: false },
];

export default function ChallengesCopy() {
  const [countdown, setCountdown] = useState(getTimeUntilSunday);
  const [challenges] = useState<MockChallenge[]>(MOCK_CHALLENGES);

  useEffect(() => {
    const timer = setInterval(() => setCountdown(getTimeUntilSunday()), 1000);
    return () => clearInterval(timer);
  }, []);

  const completed = challenges.filter(c => c.completed).length;
  const progressPct = Math.min((completed / 5) * 100, 100);

  return (
    <div className="min-h-screen pb-24 pt-4">
      <div className="mx-auto max-w-lg px-4">

        {/* Spacer for recap icon area */}
        <div className="h-8 mb-2" />

        {/* Countdown */}
        <div className="mb-6 text-center">
          <p className="text-xl font-extrabold text-primary">Time Left Until Next Drawing</p>
          <p className="text-sm text-muted-foreground mb-3 -mt-0.5">Deadline: Sunday @ Midnight</p>
          <div className="flex items-center justify-center gap-2">
            <CountdownDigit value={countdown.days} label="Days" />
            <span className="text-2xl font-bold text-muted-foreground/30 -mt-3">:</span>
            <CountdownDigit value={countdown.hours} label="Hours" />
            <span className="text-2xl font-bold text-muted-foreground/30 -mt-3">:</span>
            <CountdownDigit value={countdown.minutes} label="Min" />
          </div>
        </div>

        {/* Premium Cards - Blurred 4-digit numbers */}
        <div className="flex justify-center gap-4 mb-8 max-w-xs mx-auto">
          {/* Players */}
          <div className="flex-1 rounded-xl border-2 border-foreground bg-card px-4 py-3.5 text-foreground relative overflow-hidden shadow-[3px_3px_0px_0px_hsl(var(--foreground))]">
            <p className="text-2xl font-bold tracking-tight blur-[6px] select-none">#2,847</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground">Players</p>
            </div>
          </div>

          {/* Prize Pool */}
          <div className="flex-1 rounded-xl border-2 border-foreground bg-card px-4 py-3.5 text-foreground relative overflow-hidden shadow-[3px_3px_0px_0px_hsl(var(--foreground))]">
            <p className="text-2xl font-bold tracking-tight blur-[6px] select-none">$1,249</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Trophy className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground">Prize Pool</p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between pl-1">
            <span className="text-sm font-bold text-foreground">
              {completed}/5 completed
            </span>
            <span className="text-xs font-semibold text-primary pr-1">
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
        <div>
          <p className="mb-2 pl-1 text-sm font-bold text-foreground">
            Complete 5 of 8 challenges
          </p>
          <div className="space-y-2">
            {challenges.map((challenge, i) => (
              <div
                key={challenge.id}
                className={cn(
                  "group flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all",
                  challenge.completed
                    ? "border-primary/30 bg-primary/5 shadow-[2px_2px_0px_0px_hsl(var(--primary)/0.2)]"
                    : "border-foreground/10 bg-card shadow-[2px_2px_0px_0px_hsl(var(--foreground)/0.06)]"
                )}
              >
                {/* Checkbox */}
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all",
                    challenge.completed
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "border-2 border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {challenge.completed ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
                </div>

                {/* Title */}
                <span
                  className={cn(
                    "flex-1 text-left text-sm font-medium",
                    challenge.completed
                      ? "text-muted-foreground line-through"
                      : "text-foreground"
                  )}
                >
                  {challenge.title}
                  <span className="ml-1.5">{challenge.emoji}</span>
                </span>

                {/* Upload button */}
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                    challenge.completed
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Upload className="h-3.5 w-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
