import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Image, Film } from "lucide-react";
import { type Challenge } from "@/lib/mock-data";

interface Props {
  challenge: Challenge | null;
  onClose: () => void;
  onPost: (data: { caption: string }) => void;
}

const THUMBNAIL_OPTIONS = [
  "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1504609773096-104ff2c73ba4?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=200&h=200&fit=crop",
];

export default function ChallengeUploadModal({ challenge, onClose, onPost }: Props) {
  const [caption, setCaption] = useState("");
  const [selectedThumb, setSelectedThumb] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!challenge) return null;

  const handlePost = () => {
    onPost({ caption });
    setCaption("");
    setVideoFile(null);
    setSelectedThumb(0);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg rounded-t-2xl bg-card p-5 pb-8"
        >
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Post to Feed</h2>
            <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Challenge name */}
          <p className="mb-4 text-sm text-muted-foreground">{challenge.title}</p>

          {/* Video upload area */}
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 py-8 text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
          >
            {videoFile ? (
              <>
                <Film className="h-5 w-5" />
                <span className="font-medium">{videoFile.name}</span>
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                <span>Select video (max 30s)</span>
              </>
            )}
          </button>

          {/* Caption */}
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption (optional)"
            rows={2}
            className="mb-4 w-full resize-none rounded-xl border bg-muted/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />

          {/* Thumbnail picker */}
          <div className="mb-5">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Image className="h-3.5 w-3.5" />
              Choose thumbnail
            </p>
            <div className="flex gap-2">
              {THUMBNAIL_OPTIONS.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedThumb(i)}
                  className={`h-16 w-16 overflow-hidden rounded-lg border-2 transition-all ${
                    selectedThumb === i
                      ? "border-primary ring-1 ring-primary"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={url} alt={`Thumbnail ${i + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Post button */}
          <button
            onClick={handlePost}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Post to Feed
          </button>

          {/* Skip */}
          <button
            onClick={onClose}
            className="mt-2 w-full py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Skip for now
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
