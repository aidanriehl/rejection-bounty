import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Heart, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import AvatarDisplay from "@/components/AvatarDisplay";
import WinnerBanner from "@/components/WinnerBanner";
import { useAuth } from "@/hooks/useAuth";

const TABS = [
  { key: "week", label: "Last Week" },
  { key: "friends", label: "Friends" },
  { key: "alltime", label: "All Time" },
] as const;

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

function ReelCard({ post, isFriend }: { post: FeedPostData; isFriend?: boolean }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const lastTapRef = useRef(0);

  const customerSubdomain = import.meta.env.VITE_CLOUDFLARE_CUSTOMER_SUBDOMAIN || "f77ppcboel";
  const videoStreamUrl = post.video_id
    ? `https://customer-${customerSubdomain}.cloudflarestream.com/${post.video_id}/manifest/video.m3u8`
    : post.video_url;
  const thumbnailUrl = post.video_id
    ? `https://customer-${customerSubdomain}.cloudflarestream.com/${post.video_id}/thumbnails/thumbnail.jpg?time=${post.thumbnail_time || 0}s`
    : post.video_url || "/placeholder.svg";

  const doLike = useCallback(() => {
    if (!liked) {
      setLiked(true);
      setLikeCount((c) => c + 1);
    }
    setShowHeartAnim(true);
    setTimeout(() => setShowHeartAnim(false), 600);
  }, [liked]);

  const toggleLike = async () => {
    const newLiked = !liked;
    const newCount = newLiked ? likeCount + 1 : likeCount - 1;
    setLiked(newLiked);
    setLikeCount(newCount);

    // Update like count in database
    await supabase
      .from("posts")
      .update({ likes: newCount })
      .eq("id", post.id);
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
      className="relative h-[calc(100dvh-4.5rem)] w-full snap-start snap-always flex-shrink-0"
      onClick={handleDoubleTap}
    >
      {post.video_id ? (
        <iframe
          src={`https://customer-${customerSubdomain}.cloudflarestream.com/${post.video_id}/iframe?autoplay=true&loop=true&muted=true&controls=false`}
          className="h-full w-full object-cover select-none pointer-events-none"
          allow="autoplay; fullscreen"
          style={{ border: "none" }}
        />
      ) : (
        <img
          src={thumbnailUrl}
          alt={post.caption || "Post"}
          className="h-full w-full object-cover select-none"
          draggable={false}
        />
      )}

      <AnimatePresence>
        {showHeartAnim && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.4, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <Heart className="h-24 w-24 fill-white text-white drop-shadow-lg" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5">
        <AvatarDisplay avatar={avatar} stage={avatarStage} size="sm" />
        <button
          onClick={(e) => { e.stopPropagation(); toggleLike(); }}
          className="flex flex-col items-center gap-1 transition-transform active:scale-90"
        >
          <Heart
            className={cn(
              "h-7 w-7 transition-colors drop-shadow-md",
              liked ? "fill-rose-500 text-rose-500" : "text-white"
            )}
          />
          <span className="text-xs font-semibold text-white drop-shadow-md">{likeCount}</span>
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

      <div className="absolute bottom-6 left-4 right-16">
        <div className="flex items-center gap-2.5 mb-1">
          <span className="text-sm font-semibold text-white drop-shadow-md">{username}</span>
        </div>
        <p className="text-xs text-white/80 drop-shadow-md">{post.caption}</p>
      </div>
    </div>
  );
}

function FeedPane({ posts, emptyMessage, loading }: { posts: FeedPostData[]; emptyMessage: string; loading?: boolean }) {
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }
  if (posts.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-white/60">{emptyMessage}</p>
      </div>
    );
  }
  return (
    <div className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
      {posts.map((post) => (
        <ReelCard key={post.id} post={post} />
      ))}
    </div>
  );
}

export default function Feed() {
  const [tabIndex, setTabIndex] = useState(0);
  const [posts, setPosts] = useState<FeedPostData[]>([]);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const dragX = useMotionValue(0);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data, error } = await supabase
        .from("posts")
        .select("*, profiles:user_id(username, avatar, avatar_stage)")
        .order("created_at", { ascending: false }) as any;

      if (error) {
        console.error("Failed to fetch posts:", error);
      }
      console.log("Fetched posts:", data?.length || 0, "posts");
      setPosts((data || []) as FeedPostData[]);

      if (user) {
        const { data: friendData } = await supabase
          .from("friendships")
          .select("friend_id")
          .eq("user_id", user.id);
        setFriendIds((friendData || []).map((f: any) => f.friend_id));
      }
      setLoading(false);
    }
    fetchData();
  }, [user]);

  // Sort posts for different tabs
  const now = Date.now();
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

  const weekPosts = posts
    .filter((p) => new Date(p.created_at).getTime() > oneWeekAgo)
    .sort((a, b) => b.likes - a.likes);

  const friendPosts = posts
    .filter((p) => friendIds.includes(p.user_id))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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
      `${Math.min(TABS.length - 1, tabIndex + 1) * (100 / TABS.length)}%`,
    ]
  );

  return (
    <div data-tour="feed" className="relative h-[calc(100dvh-4.5rem)] w-full overflow-hidden bg-black">
      <div className="absolute top-0 inset-x-0 z-20 px-4 pt-2">
        <WinnerBanner />
      </div>
      <div className="absolute top-0 inset-x-0 z-10 pt-9 px-4">
        <div className="flex items-center justify-center gap-6">
          {TABS.map((tab, i) => (
            <button
              key={tab.key}
              onClick={() => setTabIndex(i)}
              className={cn(
                "text-base font-bold transition-colors",
                i === tabIndex ? "text-white" : "text-white/40"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <motion.div
        className="flex h-full"
        style={{ x: dragX }}
        animate={{ x: -tabIndex * 100 + "%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
      >
        {panes.map((panePosts, i) => (
          <div key={TABS[i].key} className="h-full w-full flex-shrink-0">
            <FeedPane
              posts={panePosts}
              emptyMessage="No videos uploaded yet"
              loading={loading}
            />
          </div>
        ))}
      </motion.div>
    </div>
  );
}
