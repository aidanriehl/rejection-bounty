import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { type FeedPost } from "@/lib/mock-data";
import AvatarDisplay from "@/components/AvatarDisplay";

interface ReelViewerProps {
  post: FeedPost;
  onClose: () => void;
}

export default function ReelViewer({ post, onClose }: ReelViewerProps) {
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const lastTapRef = useRef(0);

  const doLike = useCallback(() => {
    if (!liked) {
      setLiked(true);
      setLikeCount((c) => c + 1);
    }
    setShowHeartAnim(true);
    setTimeout(() => setShowHeartAnim(false), 300);
  }, [liked]);

  const toggleLike = () => {
    setLiked(!liked);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
  };

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      doLike();
    }
    lastTapRef.current = now;
  }, [doLike]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      onClick={handleDoubleTap}
    >
      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Full-screen image */}
      <img
        src={post.thumbnailUrl}
        alt={post.challengeTitle}
        className="h-full w-full object-cover select-none"
        draggable={false}
      />

      {/* Double-tap heart animation */}
      <AnimatePresence>
        {showHeartAnim && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.3, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 15, duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <Heart className="h-24 w-24 fill-destructive text-destructive drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right action bar */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5">
        <button
          onClick={(e) => { e.stopPropagation(); toggleLike(); }}
          className="flex flex-col items-center gap-1 transition-transform active:scale-90"
        >
          <Heart
            className={cn(
              "h-7 w-7 transition-colors",
              liked ? "fill-destructive text-destructive" : "text-white"
            )}
          />
          <span className="text-xs font-semibold text-white">{likeCount}</span>
        </button>
      </div>

      {/* Bottom info overlay */}
      <div className="absolute bottom-6 left-4 right-16 flex items-end gap-3">
        <AvatarDisplay
          avatar={post.avatar}
          stage={post.avatarStage}
          size="sm"
          showAddFriend={!post.isFriend}
          onAddFriend={() => {}}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white drop-shadow-md">{post.username}</p>
          <p className="truncate text-xs text-white/80 drop-shadow-md">{post.challengeTitle}</p>
        </div>
      </div>
    </motion.div>
  );
}
