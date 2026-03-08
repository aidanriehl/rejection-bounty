import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Grid3X3, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import AvatarDisplay from "@/components/AvatarDisplay";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { AvatarType, AvatarStage } from "@/lib/mock-data";

interface PublicProfileData {
  id: string;
  username: string | null;
  avatar: string;
  avatar_stage: number;
  profile_photo_url: string | null;
  streak: number;
  best_streak: number;
  total_completed: number;
  weeks_completed: number;
  created_at: string;
}

interface UserPost {
  id: string;
  video_id: string | null;
  video_url: string | null;
  thumbnail_time: number;
  caption: string;
  likes: number;
  created_at: string;
}

export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profileData, setProfileData] = useState<PublicProfileData | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [friendsCount, setFriendsCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [selectedPost, setSelectedPost] = useState<UserPost | null>(null);

  const isOwnProfile = user?.id === userId;

  // Redirect to own profile page if viewing self
  useEffect(() => {
    if (isOwnProfile) {
      navigate("/profile", { replace: true });
    }
  }, [isOwnProfile, navigate]);

  useEffect(() => {
    if (!userId || isOwnProfile) return;

    const fetchAll = async () => {
      setLoading(true);

      const [profileRes, postsRes, followingRes, friendsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("posts")
          .select("id, video_id, video_url, thumbnail_time, caption, likes, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase.from("friendships").select("*", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("friendships").select("*", { count: "exact", head: true }).eq("friend_id", userId),
      ]);

      if (profileRes.data) setProfileData(profileRes.data as PublicProfileData);
      setPosts((postsRes.data as UserPost[]) ?? []);
      setFollowingCount(followingRes.count ?? 0);
      setFriendsCount(friendsRes.count ?? 0);

      // Check if current user follows this profile
      if (user) {
        const { data } = await supabase
          .from("friendships")
          .select("id")
          .eq("user_id", user.id)
          .eq("friend_id", userId)
          .maybeSingle();
        setIsFollowing(!!data);
      }

      setLoading(false);
    };

    fetchAll();
  }, [userId, user, isOwnProfile]);

  const handleFollow = async () => {
    if (!user || !userId) return;
    if (isFollowing) {
      await supabase.from("friendships").delete().eq("user_id", user.id).eq("friend_id", userId);
      setIsFollowing(false);
      setFriendsCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from("friendships").insert({ user_id: user.id, friend_id: userId });
      setIsFollowing(true);
      setFriendsCount((c) => c + 1);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">Profile not found</p>
        <button onClick={() => navigate(-1)} className="text-sm text-primary font-semibold">Go back</button>
      </div>
    );
  }

  const avatar = profileData.avatar as AvatarType;
  const avatarStage = profileData.avatar_stage as AvatarStage;
  const customerSubdomain = import.meta.env.VITE_CLOUDFLARE_CUSTOMER_SUBDOMAIN || "ekqzy78t2m50j1d7";

  return (
    <div className="min-h-screen pb-24" style={{ paddingTop: "calc(env(safe-area-inset-top) + 16px)" }}>
      <div className="mx-auto max-w-lg px-4">
        {/* Top bar */}
        <div className="mb-4 flex items-center">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center -ml-2">
            <ChevronLeft className="h-6 w-6 text-foreground" />
          </button>
          <h2 className="flex-1 text-center font-bold text-foreground text-base pr-10">
            {profileData.username || "User"}
          </h2>
        </div>

        {/* Avatar */}
        <div className="mb-3 mt-2 flex flex-col items-center">
          <AvatarDisplay
            avatar={avatar}
            stage={avatarStage}
            size="lg"
            photoUrl={profileData.profile_photo_url}
            className="!h-[92px] !w-[92px] !text-[2.5rem]"
          />
          <h1 className="mt-2 font-extrabold text-foreground text-lg">
            {profileData.username || "username"}
          </h1>
        </div>

        {/* Stats row */}
        <div className="mb-4 mx-auto grid grid-cols-3 text-center pt-[10px]" style={{ maxWidth: "238px" }}>
          <div>
            <p className="text-xl font-extrabold text-foreground leading-none">{posts.length}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Posts</p>
          </div>
          <div>
            <p className="text-xl font-extrabold text-foreground leading-none">{friendsCount}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Friends</p>
          </div>
          <div>
            <p className="text-xl font-extrabold text-foreground leading-none">{followingCount}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Following</p>
          </div>
        </div>

        {/* Follow button */}
        {user && !isOwnProfile && (
          <div className="mb-5 flex justify-center">
            <button
              onClick={handleFollow}
              className={cn(
                "w-full max-w-[280px] rounded-lg py-2 text-sm font-bold transition-colors",
                isFollowing
                  ? "bg-muted text-foreground"
                  : "bg-primary text-primary-foreground"
              )}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
          </div>
        )}

        {/* Stat cards */}
        <div className="mb-5 mx-auto flex flex-col gap-2.5" style={{ maxWidth: "92%" }}>
          <div className="rounded-2xl border-2 border-foreground/10 bg-card px-4 py-3 shadow-[2px_2px_0px_0px_hsl(var(--foreground)/0.06)]">
            <div className="flex items-center gap-2">
              <span className="text-lg leading-none">🔥</span>
              <span className="text-base font-bold text-foreground">{profileData.streak} Week Streak</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Longest: {profileData.best_streak}</p>
          </div>
          <div className="rounded-2xl border-2 border-foreground/10 bg-card px-4 py-3 shadow-[2px_2px_0px_0px_hsl(var(--foreground)/0.06)]">
            <div className="flex items-center gap-2">
              <span className="text-lg leading-none">🎯</span>
              <span className="text-base font-bold text-foreground">{profileData.total_completed} Challenges Completed</span>
            </div>
          </div>
        </div>

        {/* Grid divider */}
        <div className="mb-0.5 flex justify-center border-b border-border pb-2">
          <Grid3X3 className="h-5 w-5 text-foreground" />
        </div>
      </div>

      {/* Video grid */}
      <div className="w-full">
        {posts.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-sm text-muted-foreground">No videos yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {posts.map((post) => {
              const thumbnailUrl = post.video_url || (post.video_id
                ? `https://customer-${customerSubdomain}.cloudflarestream.com/${post.video_id}/thumbnails/thumbnail.jpg?time=${post.thumbnail_time || 0}s`
                : null);
              return (
                <div
                  key={post.id}
                  className="relative aspect-[9/16] bg-muted overflow-hidden cursor-pointer"
                  onClick={() => setSelectedPost(post)}
                >
                  {thumbnailUrl ? (
                    <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-muted" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Video player modal */}
      {selectedPost?.video_id && (
        <div className="fixed inset-0 z-50 bg-black">
          <iframe
            src={`https://customer-${customerSubdomain}.cloudflarestream.com/${selectedPost.video_id}/iframe?autoplay=true&loop=true&muted=false&controls=false`}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; fullscreen"
            style={{ border: "none" }}
          />
          <button
            onClick={() => setSelectedPost(null)}
            className="absolute left-4 z-10 flex h-10 w-10 items-center justify-center text-white"
            style={{ top: "calc(env(safe-area-inset-top) + 24px)" }}
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
        </div>
      )}
    </div>
  );
}
