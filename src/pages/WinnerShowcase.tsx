import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Play, Pause, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AvatarDisplay from "@/components/AvatarDisplay";

interface WinnerData {
  winner_user_id: string;
  winning_video_url: string;
  thumbnail_url: string | null;
  trim_start: number;
  trim_end: number | null;
  prize_amount: number;
  week_key: string;
  username: string;
  avatar: string;
}

interface WinnerShowcaseProps {
  onContinue: () => void;
}

export default function WinnerShowcase({ onContinue }: WinnerShowcaseProps) {
  const [winner, setWinner] = useState<WinnerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const fetchLastWinner = async () => {
      // Get the previous week's completed drawing
      const now = new Date();
      const jan1 = new Date(now.getFullYear(), 0, 1);
      const weekNum = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
      const prevWeekNum = weekNum - 1;
      const prevWeekKey = prevWeekNum > 0
        ? `${now.getFullYear()}-w${prevWeekNum}`
        : `${now.getFullYear() - 1}-w52`;

      const { data } = await supabase
        .from("weekly_drawings")
        .select("*")
        .eq("status", "complete")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && data.winner_user_id && data.winning_video_url) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, avatar")
          .eq("id", data.winner_user_id)
          .maybeSingle();

        setWinner({
          winner_user_id: data.winner_user_id,
          winning_video_url: data.winning_video_url,
          thumbnail_url: (data as any).thumbnail_url ?? null,
          trim_start: Number((data as any).trim_start ?? 0),
          trim_end: (data as any).trim_end ? Number((data as any).trim_end) : null,
          prize_amount: Number(data.prize_amount),
          week_key: data.week_key,
          username: profile?.username ?? "Winner",
          avatar: profile?.avatar ?? "dragon",
        });
      }
      setLoading(false);
    };
    fetchLastWinner();
  }, []);

  const handleVideoPlay = () => {
    if (!videoRef.current || !winner) return;
    if (playing) {
      videoRef.current.pause();
      setPlaying(false);
    } else {
      videoRef.current.currentTime = winner.trim_start;
      videoRef.current.play();
      setPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || !winner) return;
    if (winner.trim_end && videoRef.current.currentTime >= winner.trim_end) {
      videoRef.current.pause();
      setPlaying(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ backgroundColor: "hsl(var(--background))" }}>
        <span className="text-2xl animate-pulse">🏆</span>
      </div>
    );
  }

  if (!winner) {
    // No previous winner, skip
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: "hsl(var(--background))" }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center mb-6"
      >
        <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-3"
          style={{ backgroundColor: "hsl(45 90% 50% / 0.15)", border: "1px solid hsl(45 90% 50% / 0.3)" }}
        >
          <Trophy className="h-4 w-4" style={{ color: "hsl(45 90% 50%)" }} />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "hsl(45 90% 50%)" }}>
            Last Week's Winner
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{winner.week_key}</p>
      </motion.div>

      {/* Winner info */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, type: "spring" }}
        className="flex items-center gap-3 mb-5"
      >
        <div className="h-14 w-14 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "hsl(var(--primary) / 0.1)" }}
        >
          <AvatarDisplay avatar={winner.avatar} stage={0} size={48} />
        </div>
        <div>
          <p className="text-xl font-extrabold text-foreground">{winner.username}</p>
          <p className="text-sm font-bold" style={{ color: "hsl(45 90% 50%)" }}>
            Won ${winner.prize_amount.toFixed(2)}
          </p>
        </div>
      </motion.div>

      {/* Video */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, type: "spring" }}
        className="relative w-full max-w-xs rounded-2xl overflow-hidden border-2 shadow-lg"
        style={{ borderColor: "hsl(45 90% 50% / 0.3)" }}
      >
        {winner.thumbnail_url && !playing ? (
          <button onClick={handleVideoPlay} className="relative w-full aspect-[9/16]">
            <img src={winner.thumbnail_url} alt="Winner video thumbnail" className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="rounded-full p-4" style={{ backgroundColor: "hsl(45 90% 50%)" }}>
                <Play className="h-8 w-8 text-white fill-white" />
              </div>
            </div>
          </button>
        ) : (
          <div className="relative">
            <video
              ref={videoRef}
              src={winner.winning_video_url}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setPlaying(false)}
              className="w-full aspect-[9/16] object-cover"
              playsInline
              poster={winner.thumbnail_url ?? undefined}
            />
            <button
              onClick={handleVideoPlay}
              className="absolute inset-0 flex items-center justify-center"
            >
              {!playing && (
                <div className="rounded-full p-4 bg-black/40">
                  <Play className="h-8 w-8 text-white fill-white" />
                </div>
              )}
            </button>
          </div>
        )}
      </motion.div>

      {/* Continue */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        onClick={onContinue}
        className="mt-8 flex items-center gap-2 rounded-full px-8 py-3 text-sm font-bold uppercase tracking-wider transition-transform active:scale-95"
        style={{
          backgroundColor: "hsl(var(--foreground))",
          color: "hsl(var(--background))",
        }}
      >
        Continue
        <ChevronRight className="h-4 w-4" />
      </motion.button>
    </motion.div>
  );
}
