import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Heart, Loader2, MessageCircle, X, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import AvatarDisplay from "@/components/AvatarDisplay";
import WinnerBanner from "@/components/WinnerBanner";
import { useAuth } from "@/hooks/useAuth";

const TABS = [
{ key: "week", label: "This Week" },
{ key: "friends", label: "Friends" },
{ key: "alltime", label: "All Time" }] as
const;

// Get liked posts from localStorage
function getLikedPosts(): Set<string> {
  try {
    const stored = localStorage.getItem("liked_posts");
    return new Set(stored ? JSON.parse(stored) : []);
  } catch {
    return new Set();
  }
}

// Save liked posts to localStorage
function saveLikedPosts(liked: Set<string>) {
  localStorage.setItem("liked_posts", JSON.stringify([...liked]));
}

interface FeedPostData {
  id: string;
  user_id: string;
  challenge_id: string;
  video_id: string | null;
  video_url: string | null;
  thumbnail_time: number;
  trim_start: number;
  trim_end: number | null;
  caption: string;
  likes: number;
  created_at: string;
  profiles: {
    username: string | null;
    avatar: string;
    avatar_stage: number;
  } | null;
}

function ReelCard({ post, onOpenComments }: {post: FeedPostData;onOpenComments: (postId: string) => void;}) {
  const [likedPosts, setLikedPosts] = useState<Set<string>>(() => getLikedPosts());
  const liked = likedPosts.has(post.id);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const lastTapRef = useRef(0);

  const customerSubdomain = import.meta.env.VITE_CLOUDFLARE_CUSTOMER_SUBDOMAIN || "ekqzy78t2m50j1d7";
  const thumbnailUrl = post.video_id ?
  `https://customer-${customerSubdomain}.cloudflarestream.com/${post.video_id}/thumbnails/thumbnail.jpg?time=${post.thumbnail_time || 0}s` :
  post.video_url || "/placeholder.svg";

  const doLike = useCallback(async () => {
    if (!liked) {
      const newLiked = new Set(likedPosts);
      newLiked.add(post.id);
      setLikedPosts(newLiked);
      saveLikedPosts(newLiked);
      setLikeCount((c) => c + 1);
      await supabase.from("posts").update({ likes: likeCount + 1 }).eq("id", post.id);
    }
    setShowHeartAnim(true);
    setTimeout(() => setShowHeartAnim(false), 300);
  }, [liked, likedPosts, post.id, likeCount]);

  const toggleLike = async () => {
    const newLiked = new Set(likedPosts);
    if (liked) {
      newLiked.delete(post.id);
      setLikeCount((c) => c - 1);
      await supabase.from("posts").update({ likes: likeCount - 1 }).eq("id", post.id);
    } else {
      newLiked.add(post.id);
      setLikeCount((c) => c + 1);
      await supabase.from("posts").update({ likes: likeCount + 1 }).eq("id", post.id);
    }
    setLikedPosts(newLiked);
    saveLikedPosts(newLiked);
  };

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      doLike();
    }
    lastTapRef.current = now;
  }, [doLike]);

  const avatar = (post.profiles?.avatar || "dragon") as any;
  const avatarStage = (post.profiles?.avatar_stage || 0) as any;
  const username = post.profiles?.username || "Anonymous";

  return (
    <div
      className="relative w-full snap-start snap-always flex-shrink-0"
      style={{ height: "calc(100dvh - 3rem - env(safe-area-inset-bottom))" }}
      onClick={handleDoubleTap}>
      
      {post.video_id ?
      <iframe
        src={`https://customer-${customerSubdomain}.cloudflarestream.com/${post.video_id}/iframe?autoplay=true&loop=true&muted=true&controls=false&poster=https%3A%2F%2Fcustomer-${customerSubdomain}.cloudflarestream.com%2F${post.video_id}%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D${post.thumbnail_time || 0}s`}
        className="h-full w-full object-cover select-none pointer-events-none"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
        style={{ border: "none" }} /> :


      <img
        src={thumbnailUrl}
        alt={post.caption || "Post"}
        className="h-full w-full object-cover select-none"
        draggable={false} />

      }

      <AnimatePresence>
        {showHeartAnim &&
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.4, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none">
          
            <Heart className="h-24 w-24 fill-rose-500 text-rose-500 drop-shadow-lg" />
          </motion.div>
        }
      </AnimatePresence>

      <div className="absolute right-4 bottom-36 flex flex-col items-center gap-5">
        <AvatarDisplay avatar={avatar} stage={avatarStage} size="sm" />
        <button
          onClick={(e) => {e.stopPropagation();toggleLike();}}
          className="flex flex-col items-center gap-1 transition-transform active:scale-90">
          
          <Heart
            className={cn(
              "h-7 w-7 transition-colors drop-shadow-md",
              liked ? "fill-rose-500 text-rose-500" : "text-white"
            )} />
          
          <span className="text-xs font-semibold text-white drop-shadow-md">{likeCount}</span>
        </button>
        <button
          onClick={(e) => {e.stopPropagation();onOpenComments(post.id);}}
          className="flex flex-col items-center gap-1 transition-transform active:scale-90">
          
          <MessageCircle className="h-7 w-7 text-white drop-shadow-md" />
          <span className="text-xs font-semibold text-white drop-shadow-md">0</span>
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

      <div className="absolute bottom-8 left-5 right-20">
        <div className="flex items-center gap-2.5 mb-1.5">
          <span className="text-base font-bold text-white drop-shadow-md">@{username}</span>
        </div>
        <p className="text-sm text-white/90 drop-shadow-md min-h-[1.25rem]">{post.caption || ""}</p>
      </div>
    </div>);

}

function FeedPane({ posts, emptyMessage, loading, onOpenComments }: {posts: FeedPostData[];emptyMessage: string;loading?: boolean;onOpenComments: (postId: string) => void;}) {
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>);

  }
  if (posts.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-white/60">{emptyMessage}</p>
      </div>);

  }
  return (
    <div data-scroll-container className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
      {posts.map((post) =>
      <ReelCard key={post.id} post={post} onOpenComments={onOpenComments} />
      )}
    </div>);

}

// Instagram-style comments sheet
function CommentsSheet({ postId, onClose }: {postId: string;onClose: () => void;}) {
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input when sheet opens
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSend = async () => {
    if (!comment.trim() || sending) return;
    setSending(true);
    // TODO: Save comment to database when comments table exists
    console.log("Comment on post", postId, ":", comment);
    setComment("");
    setSending(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50"
      onClick={onClose}>
      
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl max-h-[70vh] flex flex-col"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="text-base font-semibold text-foreground">Comments</span>
          <button onClick={onClose} className="p-1">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Comments list */}
        <div data-scroll-container className="flex-1 overflow-y-auto px-4 py-4 min-h-[200px]">
          <p className="text-sm text-muted-foreground text-center py-8">No comments yet. Be the first!</p>
        </div>

        {/* Input - Instagram style */}
        <div className="px-4 py-3 border-t flex items-center gap-3 bg-background">
          <input
            ref={inputRef}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Add a comment..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none" />
          
          <button
            onClick={handleSend}
            disabled={!comment.trim() || sending}
            className="text-primary font-semibold text-sm disabled:opacity-40">
            
            Post
          </button>
        </div>
      </motion.div>
    </motion.div>);

}

export default function Feed() {
  const [tabIndex, setTabIndex] = useState(0);
  const [posts, setPosts] = useState<FeedPostData[]>([]);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const { user } = useAuth();
  const dragX = useMotionValue(0);

  const fetchData = async () => {
    setLoading(true);

    // Fetch posts with profile data via FK join
    const { data, error } = await supabase.
    from("posts").
    select("*, profiles!posts_user_id_fkey(username, avatar, avatar_stage)").
    order("created_at", { ascending: false });

    if (error) {
      console.error("[Feed] Failed to fetch posts:", error);
    }
    setPosts((data || []) as FeedPostData[]);

    // Fetch friends list
    if (user) {
      const { data: friendData } = await supabase.
      from("friendships").
      select("friend_id").
      eq("user_id", user.id);
      setFriendIds((friendData || []).map((f: any) => f.friend_id));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Refresh feed when a new video is uploaded
  useEffect(() => {
    const handleUploadComplete = () => {
      setTimeout(fetchData, 2000);
    };
    window.addEventListener("challenge-completed", handleUploadComplete);
    return () => window.removeEventListener("challenge-completed", handleUploadComplete);
  }, []);

  // Sort posts for different tabs
  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const weekPosts = posts.
  filter((p) => new Date(p.created_at).getTime() > oneWeekAgo).
  sort((a, b) => b.likes - a.likes);

  const friendPosts = posts.
  filter((p) => friendIds.includes(p.user_id)).
  sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const allTimePosts = [...posts].sort((a, b) => b.likes - a.likes);

  const panes = [weekPosts, friendPosts, allTimePosts];

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x < -threshold && tabIndex < TABS.length - 1) {
      setTabIndex(tabIndex + 1);
    } else if (info.offset.x > threshold && tabIndex > 0) {
      setTabIndex(tabIndex - 1);
    }
  };

  const indicatorX = useTransform(
    dragX,
    [200, 0, -200],
    [
    `${Math.max(0, tabIndex - 1) * (100 / TABS.length)}%`,
    `${tabIndex * (100 / TABS.length)}%`,
    `${Math.min(TABS.length - 1, tabIndex + 1) * (100 / TABS.length)}%`]

  );

  return (
    <div
      className="fixed inset-0 overflow-hidden bg-black"
      style={{ paddingBottom: "calc(3rem + env(safe-area-inset-bottom))" }}>
      
      {/* Tabs header - positioned with safe area */}
      <div
        className="absolute top-0 inset-x-0 z-20 px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 8px)" }}>
        
        <WinnerBanner />
      </div>
      <div
        className="absolute inset-x-0 z-10 px-4"
        style={{ top: "calc(env(safe-area-inset-top) + 20px)" }}>
        
        <div className="flex items-center justify-center gap-6">
          {TABS.map((tab, i) =>
          <button
            key={tab.key}
            onClick={() => setTabIndex(i)}
            className={cn(
              "text-[1.2rem] font-bold transition-colors",
              i === tabIndex ? "text-white" : "text-white/40"
            )}>
            
              {tab.label}
            </button>
          )}
        </div>
      </div>

      {/* Swipeable panes - leave space for bottom nav */}
      <motion.div
        className="flex h-full"
        style={{ x: dragX }}
        animate={{ x: -tabIndex * 100 + "%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}>
        
        {panes.map((panePosts, i) =>
        <div key={TABS[i].key} className="h-full w-full flex-shrink-0">
            <FeedPane
            posts={panePosts}
            emptyMessage="No videos uploaded yet"
            loading={loading}
            onOpenComments={setCommentsPostId} />
          
          </div>
        )}
      </motion.div>

      {/* Comments sheet */}
      <AnimatePresence>
        {commentsPostId &&
        <CommentsSheet postId={commentsPostId} onClose={() => setCommentsPostId(null)} />
        }
      </AnimatePresence>
    </div>);

}