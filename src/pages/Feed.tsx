import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Heart, Loader2 } from "lucide-react";
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

function ReelCard({ post, currentUserId, initialFollowing, onNavigateProfile }: {post: FeedPostData; currentUserId?: string; initialFollowing: boolean; onNavigateProfile: (userId: string) => void;}) {
  const [likedPosts, setLikedPosts] = useState<Set<string>>(() => getLikedPosts());
  const liked = likedPosts.has(post.id);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const lastTapRef = useRef(0);

  const isOwnPost = currentUserId === post.user_id;

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

  const toggleLike = () => {
    const newLiked = new Set(likedPosts);
    if (liked) {
      newLiked.delete(post.id);
      setLikeCount((c) => c - 1);
      supabase.from("posts").update({ likes: likeCount - 1 }).eq("id", post.id);
    } else {
      newLiked.add(post.id);
      setLikeCount((c) => c + 1);
      supabase.from("posts").update({ likes: likeCount + 1 }).eq("id", post.id);
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

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId || isOwnPost) return;

    if (isFollowing) {
      // Unfollow
      await supabase.from("friendships").delete().eq("user_id", currentUserId).eq("friend_id", post.user_id);
      setIsFollowing(false);
    } else {
      // Follow
      await supabase.from("friendships").insert({ user_id: currentUserId, friend_id: post.user_id });
      setIsFollowing(true);
    }
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onNavigateProfile(post.user_id);
  };

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

      {/* Bottom gradient */}
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

      {/* Bottom info */}
      <div className="absolute bottom-8 left-4 right-4">
        {/* Row 1: Avatar + Username + Follow on left, Likes on right */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-3">
            <button onClick={handleProfileClick} className="flex-shrink-0">
              <AvatarDisplay avatar={avatar} stage={avatarStage} size="sm" />
            </button>
            <button onClick={handleProfileClick}>
              <span className="text-base font-bold text-white drop-shadow-md">@{username}</span>
            </button>
            {!isOwnPost && currentUserId && (
              <button
                onClick={handleFollow}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-semibold transition-colors",
                  isFollowing
                    ? "bg-white/20 text-white border border-white/40"
                    : "bg-white text-black"
                )}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            )}
          </div>
          {/* Likes on right */}
          <button onClick={toggleLike} className="flex items-center gap-1.5 mr-1">
            <Heart className={cn("h-3.5 w-3.5 drop-shadow-md", liked ? "fill-white text-white" : "text-white/50")} />
            <span className="text-xs text-white/50 drop-shadow-md">{likeCount} likes</span>
          </button>
        </div>
        {/* Row 2: Caption */}
        {post.caption && (
          <p className="text-sm text-white/90 drop-shadow-md">{post.caption}</p>
        )}
      </div>
    </div>);

}

function FeedPane({ posts, emptyMessage, loading, currentUserId, friendIds }: {posts: FeedPostData[];emptyMessage: string;loading?: boolean;currentUserId?: string;friendIds: string[];}) {
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
      <ReelCard key={post.id} post={post} currentUserId={currentUserId} initialFollowing={friendIds.includes(post.user_id)} />
      )}
    </div>);

}

export default function Feed() {
  const [tabIndex, setTabIndex] = useState(0);
  const [posts, setPosts] = useState<FeedPostData[]>([]);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
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
            currentUserId={user?.id}
            friendIds={friendIds} />
          
          </div>
        )}
      </motion.div>
    </div>);

}