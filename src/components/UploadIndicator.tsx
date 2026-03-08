import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { useUpload } from "@/contexts/UploadContext";

export default function UploadIndicator() {
  const { status, progress, retry, clearUpload } = useUpload();

  // Auto-dismiss "done" banner after 3 seconds
  useEffect(() => {
    if (status === "done") {
      const timer = setTimeout(clearUpload, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, clearUpload]);

  if (status === "idle") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="fixed left-4 right-4 z-50 mx-auto max-w-lg"
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
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
            <p className="text-sm font-semibold text-foreground truncate">
              {status === "uploading"
                ? `Uploading video… ${progress}%`
                : status === "done"
                ? "Upload complete! 🎬"
                : "Upload failed"}
            </p>
            {status === "uploading" && (
              <p className="text-[10px] text-muted-foreground truncate">
                Don't leave app until upload finishes
              </p>
            )}
            {status === "error" && (
              <p className="text-[10px] text-muted-foreground truncate">
                Tap retry to try again
              </p>
            )}
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
