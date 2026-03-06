import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle, X, Ticket } from "lucide-react";
import { useUpload } from "@/contexts/UploadContext";
import { supabase } from "@/integrations/supabase/client";

export default function UploadIndicator() {
  const { status, progress, retry, clearUpload } = useUpload();
  const [entryCount, setEntryCount] = useState<number | null>(null);

  // Fetch entry count when upload completes
  useEffect(() => {
    if (status !== "done") {
      setEntryCount(null);
      return;
    }

    const fetchEntries = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.log("[UploadIndicator] No session found");
        return;
      }

      // Get current week key (YYYY-WXX format) - MUST match UploadContext.tsx
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const weekNum = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
      const weekKey = `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;

      console.log("[UploadIndicator] Fetching entries for week:", weekKey);
      console.log("[UploadIndicator] User ID:", session.user.id);

      // Count completions for THIS week only
      const { count, error } = await supabase
        .from("challenge_completions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .eq("week_key", weekKey);

      if (error) {
        console.error("[UploadIndicator] Error fetching entries:", error);
      }

      console.log("[UploadIndicator] Entry count:", count);
      setEntryCount(count ?? 0);
    };

    // Longer delay to ensure completion is inserted first
    setTimeout(fetchEntries, 1500);
  }, [status]);

  if (status === "idle") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-lg"
      >
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-lg relative">
          {/* Icon */}
          {status === "uploading" && (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
          )}
          {status === "done" && (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
          )}
          {status === "error" && (
            <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
          )}

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">
              {status === "uploading"
                ? `Uploading video… ${progress}%`
                : status === "done"
                ? "Upload complete! 🎬"
                : "Upload failed"}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              {status === "uploading"
                ? "Don't leave app until upload finishes"
                : status === "done" && entryCount !== null
                ? `🎟️ You have ${entryCount} ${entryCount === 1 ? "entry" : "entries"} in this week's draw`
                : status === "error"
                ? "Tap retry to try again"
                : ""}
            </p>
          </div>

          {/* Actions */}
          {status === "error" && (
            <button
              onClick={retry}
              className="shrink-0 rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
            >
              Retry
            </button>
          )}
          {(status === "done" || status === "error") && (
            <button onClick={clearUpload} className="shrink-0 text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Progress bar */}
          {status === "uploading" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden rounded-b-xl">
              <motion.div
                className="h-full bg-primary"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
