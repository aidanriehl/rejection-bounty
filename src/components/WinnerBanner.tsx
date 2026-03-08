import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import WinnerMessageThread from "@/components/WinnerMessageThread";

export default function WinnerBanner() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [weekKey, setWeekKey] = useState("");
  const [messageCount, setMessageCount] = useState(0);
  const [showThread, setShowThread] = useState(false);
  const [daysLeft, setDaysLeft] = useState(0);

  useEffect(() => {
    if (!user) return;

    const check = async () => {
      // Check if messaging is enabled
      const { data: settings } = await supabase
        .from("app_settings")
        .select("winner_messaging_enabled")
        .limit(1)
        .maybeSingle();

      if (!settings?.winner_messaging_enabled) return;

      // Find a recent completed drawing where current user is winner
      const { data: drawings } = await supabase
        .from("weekly_drawings")
        .select("*")
        .eq("status", "complete")
        .eq("winner_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!drawings || drawings.length === 0) {
        // QA PREVIEW: Force-show banner for testing
        setWeekKey("2026-W10");
        setDaysLeft(5);
        setVisible(true);
        return;
      }

      const drawing = drawings[0];
      const createdAt = new Date(drawing.created_at);
      const now = new Date();
      const daysSince = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSince > 7) return;

      setWeekKey(drawing.week_key);
      setDaysLeft(Math.max(0, Math.ceil(7 - daysSince)));
      setVisible(true);

      // Count messages
      const { count } = await supabase
        .from("winner_messages")
        .select("*", { count: "exact", head: true })
        .eq("week_key", drawing.week_key)
        .eq("winner_user_id", user.id);

      setMessageCount(count ?? 0);
    };

    check();

      // Count messages
      const { count } = await supabase
        .from("winner_messages")
        .select("*", { count: "exact", head: true })
        .eq("week_key", drawing.week_key)
        .eq("winner_user_id", user.id);

      setMessageCount(count ?? 0);
    };

    check();

    // Listen for new messages
    const channel = supabase
      .channel("winner-banner-messages")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "winner_messages",
      }, () => {
        check();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (!visible || !user) return null;

  return (
    <>
      <motion.button
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => setShowThread(true)}
        className="relative w-full overflow-hidden rounded-xl px-4 py-3 flex items-center justify-between mb-4"
        style={{
          background: "linear-gradient(135deg, hsl(43 96% 56%) 0%, hsl(38 90% 45%) 50%, hsl(35 85% 38%) 100%)",
          boxShadow: "0 4px 20px rgba(245, 184, 0, 0.3)",
        }}
      >
        {/* Shimmer overlay */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(90deg, transparent 0%, hsla(0,0%,100%,0.15) 50%, transparent 100%)",
          }}
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
        />

        <div className="flex items-center gap-2.5 z-10">
          <span className="text-lg">🏆</span>
          <span className="text-sm font-extrabold text-white uppercase tracking-wide">Winner!</span>
        </div>

        <div className="flex items-center gap-1.5 z-10">
          <span className="text-xs font-bold text-white/90">
            {messageCount > 0 ? `${messageCount} message${messageCount !== 1 ? "s" : ""}` : "View"}
          </span>
          <ChevronRight className="h-4 w-4 text-white/80" />
        </div>
      </motion.button>

      {showThread && (
        <WinnerMessageThread
          weekKey={weekKey}
          userId={user.id}
          daysLeft={daysLeft}
          onClose={() => setShowThread(false)}
        />
      )}
    </>
  );
}
