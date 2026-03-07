import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Grid3X3, Camera, ImagePlus, HelpCircle, X, Info, Loader2 } from "lucide-react";

import { motion } from "framer-motion";
import AvatarDisplay from "@/components/AvatarDisplay";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import MilestoneCelebration from "@/components/MilestoneCelebration";
import type { AvatarType, AvatarStage } from "@/lib/mock-data";

interface UserPost {
  id: string;
  video_id: string | null;
  video_url: string | null; // thumbnail URL
  thumbnail_time: number;
  caption: string;
  likes: number;
  created_at: string;
}

const MILESTONES = [10, 50, 100, 150, 200] as const;

export type MedalTier = "bronze" | "silver" | "gold" | "diamond" | "champion";

const MEDAL_COLORS: Record<MedalTier, {fill: string;stroke: string;ribbon: string;}> = {
  bronze: { fill: "#CD7F32", stroke: "#A0522D", ribbon: "#8B4513" },
  silver: { fill: "#C0C0C0", stroke: "#A8A8A8", ribbon: "#808080" },
  gold: { fill: "#FFD700", stroke: "#DAA520", ribbon: "#B8860B" },
  diamond: { fill: "#B9F2FF", stroke: "#7EC8E3", ribbon: "#4A90D9" },
  champion: { fill: "#E8D44D", stroke: "#DAA520", ribbon: "#8B0000" }
};

const MEDALS: Record<number, {tier: MedalTier;label: string;}> = {
  10: { tier: "bronze", label: "Bronze" },
  50: { tier: "silver", label: "Silver" },
  100: { tier: "gold", label: "Gold" },
  150: { tier: "diamond", label: "Diamond" },
  200: { tier: "champion", label: "Champion" }
};

function MedalIcon({ tier, size = 28 }: {tier: MedalTier;size?: number;}) {
  const c = MEDAL_COLORS[tier];
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L16 12L20 2" stroke={c.ribbon} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="16" cy="20" r="10" fill={c.fill} stroke={c.stroke} strokeWidth="1.5" />
      <circle cx="16" cy="20" r="6.5" fill="none" stroke={c.stroke} strokeWidth="0.8" opacity="0.5" />
      <path d="M16 15.5L17.5 18.5L20.5 19L18.2 21.2L18.8 24.5L16 23L13.2 24.5L13.8 21.2L11.5 19L14.5 18.5Z" fill={c.stroke} opacity="0.6" />
    </svg>);

}

function getMilestone(completed: number) {
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    if (completed >= MILESTONES[i]) {
      const next = MILESTONES[i + 1];
      if (next) {
        return { current: completed, goal: next, medal: MEDALS[MILESTONES[i]] };
      }
      return { current: completed, goal: MILESTONES[i], medal: MEDALS[MILESTONES[i]] };
    }
  }
  return { current: completed, goal: MILESTONES[0], medal: null };
}

export default function Profile() {
  const { user, profile, loading, setProfile } = useAuth();
  const [showWhyModal, setShowWhyModal] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  const username = profile?.username || "Username";
  const avatar = (profile?.avatar || "dragon") as AvatarType;
  const avatarStage = (profile?.avatar_stage ?? 0) as AvatarStage;
  const streak = profile?.streak ?? 0;
  const bestStreak = profile?.best_streak ?? 0;
  const totalCompleted = profile?.total_completed ?? 0;
  const weeksCompleted = profile?.weeks_completed ?? 0;
  const photoUrl = profile?.profile_photo_url ?? null;

  // User's posts
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [selectedPost, setSelectedPost] = useState<UserPost | null>(null);
  const [friendsCount, setFriendsCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);


  // Milestone celebration — check if a new milestone was just reached
  const [celebrateMilestone, setCelebrateMilestone] = useState<{tier: MedalTier;milestone: number;} | null>(null);

  useEffect(() => {
    if (!user || totalCompleted === 0) return;
    const storageKey = `milestone_celebrated_${user.id}`;
    const celebrated = JSON.parse(localStorage.getItem(storageKey) || "[]") as number[];
    // Find the highest milestone the user has reached but not celebrated
    for (let i = MILESTONES.length - 1; i >= 0; i--) {
      const m = MILESTONES[i];
      if (totalCompleted >= m && !celebrated.includes(m)) {
        setCelebrateMilestone({ tier: MEDALS[m].tier, milestone: m });
        localStorage.setItem(storageKey, JSON.stringify([...celebrated, m]));
        break;
      }
    }
  }, [totalCompleted, user]);

  // Fetch friends (followers) and following counts
  useEffect(() => {
    const fetchCounts = async () => {
      if (!user) return;
      // Following = people I follow
      const { count: fCount } = await supabase.
      from("friendships").
      select("*", { count: "exact", head: true }).
      eq("user_id", user.id);
      setFollowingCount(fCount ?? 0);
      // Friends = people who follow me
      const { count: frCount } = await supabase.
      from("friendships").
      select("*", { count: "exact", head: true }).
      eq("friend_id", user.id);
      setFriendsCount(frCount ?? 0);
    };
    fetchCounts();
  }, [user]);

  // Fetch user's posts
  useEffect(() => {
    const fetchPosts = async () => {
      if (!user) {
        setLoadingPosts(false);
        return;
      }
      setLoadingPosts(true);
      const { data, error } = await supabase.
      from("posts").
      select("id, video_id, video_url, thumbnail_time, caption, likes, created_at").
      eq("user_id", user.id).
      order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch posts:", error);
      }
      setPosts(data as UserPost[] ?? []);
      setLoadingPosts(false);
    };

    fetchPosts();

    const handleUploadComplete = () => {
      setTimeout(fetchPosts, 2000);
    };
    window.addEventListener("challenge-completed", handleUploadComplete);
    return () => window.removeEventListener("challenge-completed", handleUploadComplete);
  }, [user]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.
      from("avatars").
      upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.
      from("avatars").
      getPublicUrl(filePath);
      const urlWithBuster = `${publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase.
      from("profiles").
      update({ profile_photo_url: urlWithBuster }).
      eq("id", user.id);
      if (updateError) throw updateError;
      setProfile({ ...profile!, profile_photo_url: urlWithBuster });
    } catch (err) {
      console.error("Upload failed:", err);
      toast({ title: "Failed to upload photo", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleLongPressStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setShowPhotoMenu(true);
    }, 500);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>);

  }

  const ms = getMilestone(totalCompleted);
  const progressPct = Math.min(ms.current / ms.goal * 100, 100);

  // Calculate weeks since signup for percentage
  const weeksSinceSignup = (() => {
    if (!profile?.created_at) return 1;
    const created = new Date(profile.created_at);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const weeks = Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)));
    return weeks;
  })();
  const weeksCompletedPct = Math.min(Math.round(weeksCompleted / weeksSinceSignup * 100), 100);

  return (
    <div className="min-h-screen pb-24" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
      {celebrateMilestone &&
      <MilestoneCelebration
        tier={celebrateMilestone.tier}
        milestone={celebrateMilestone.milestone}
        onDone={() => setCelebrateMilestone(null)} />

      }
      <div className="mx-auto max-w-lg px-4">
        {/* Top bar */}
        <div className="mb-4 flex items-center justify-between">
          <button
            data-tour="why-rejected"
            onClick={() => setShowWhyModal(true)}
            className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors active:bg-muted/70">
            
            <HelpCircle className="h-3.5 w-3.5" />
            Why get rejected?
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                navigate("/challenges");
                setTimeout(() => window.dispatchEvent(new Event("replay-tour")), 300);
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full text-foreground">
              
              <Info className="h-5 w-5" />
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="flex h-11 w-11 items-center justify-center rounded-full text-foreground">
              
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Centered Avatar */}
        <div className="mb-3 mt-2 flex flex-col items-center">
          <div
            className="relative shrink-0 cursor-pointer select-none"
            onPointerDown={handleLongPressStart}
            onPointerUp={handleLongPressEnd}
            onPointerLeave={handleLongPressEnd}
            onContextMenu={(e) => e.preventDefault()}
            onClick={() => !photoUrl && setShowPhotoMenu(true)}>
            
            <AvatarDisplay
              avatar={avatar}
              stage={avatarStage}
              size="lg"
              photoUrl={photoUrl}
              className="!h-20 !w-20 !text-4xl" />
            
            {!photoUrl &&
            <div className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-primary border-[2px] border-background shadow-sm">
                <span className="text-[9px] font-bold text-primary-foreground leading-none">+</span>
              </div>
            }
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handlePhotoUpload} />
          </div>
          {uploading &&
          <p className="mt-1 text-[10px] text-muted-foreground">Uploading…</p>
          }

          {/* Username */}
          <h1 className="mt-2 text-base font-extrabold text-foreground">{profile?.username || "username"}</h1>
        </div>

        {/* Stats row */}
        <div className="mb-5 grid grid-cols-3 text-center pt-[10px]">
          <div>
            <p className="text-xl font-extrabold text-foreground leading-none">{posts.length}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Posts</p>
          </div>
          <div
            className="cursor-pointer"
            onClick={() => navigate("/friends?tab=friends")}>
            <p className="text-xl font-extrabold text-foreground leading-none">{friendsCount}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Friends</p>
          </div>
          <div
            className="cursor-pointer"
            onClick={() => navigate("/friends?tab=following")}>
            <p className="text-xl font-extrabold text-foreground leading-none">{followingCount}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Following</p>
          </div>
        </div>

        {/* Stat boxes - 2x2 grid */}
        <div className="mb-5 grid grid-cols-2 gap-2.5">
          {/* Week Streak */}
          <div className="rounded-2xl border-2 border-foreground/10 bg-card px-3 py-3.5 shadow-[2px_2px_0px_0px_hsl(var(--foreground)/0.06)]">
            <div className="flex items-center gap-1.5">
              <span className="text-2xl leading-none">🔥</span>
              <span className="text-2xl font-extrabold leading-none text-foreground">{streak}</span>
            </div>
            <p className="mt-1.5 text-[11px] font-semibold text-muted-foreground">Week Streak</p>
          </div>

          {/* Best Streak */}
          <div className="rounded-2xl border-2 border-foreground/10 bg-card px-3 py-3.5 shadow-[2px_2px_0px_0px_hsl(var(--foreground)/0.06)]">
            <div className="flex items-center gap-1.5">
              <span className="text-2xl leading-none">⚡</span>
              <span className="text-2xl font-extrabold leading-none text-foreground">{bestStreak}</span>
            </div>
            <p className="mt-1.5 text-[11px] font-semibold text-muted-foreground">Best Streak</p>
          </div>

          {/* Challenges Completed */}
          <div className="rounded-2xl border-2 border-foreground/10 bg-card px-3 py-3.5 shadow-[2px_2px_0px_0px_hsl(var(--foreground)/0.06)]">
            <div className="flex items-center gap-1.5">
              <span className="text-2xl leading-none">🎯</span>
              <span className="text-2xl font-extrabold leading-none text-foreground">{ms.current}/{ms.goal}</span>
            </div>
            <p className="mt-1.5 text-[11px] font-semibold text-muted-foreground">Challenges</p>
            {ms.medal &&
            <div className="flex items-center gap-1 mt-1">
                <MedalIcon tier={ms.medal.tier} size={14} />
                <span className="text-[9px] font-semibold text-muted-foreground">{ms.medal.label}</span>
              </div>
            }
            <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={false}
                animate={{ width: `${progressPct}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }} />
              
            </div>
          </div>

          {/* Weeks Completed % */}
          <div className="rounded-2xl border-2 border-foreground/10 bg-card px-3 py-3.5 shadow-[2px_2px_0px_0px_hsl(var(--foreground)/0.06)]">
            <div className="flex items-center gap-1.5">
              <span className="text-2xl leading-none">📅</span>
              <span className="text-2xl font-extrabold leading-none text-foreground">{weeksCompletedPct}%</span>
            </div>
            <p className="mt-1.5 text-[11px] font-semibold text-muted-foreground">Weeks Completed</p>
            <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={false}
                animate={{ width: `${weeksCompletedPct}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }} />
              
            </div>
          </div>
        </div>

        {/* Grid icon + divider */}
        <div className="mb-0.5 flex justify-center border-b border-border pb-2">
          <Grid3X3 className="h-5 w-5 text-foreground" />
        </div>
      </div>

      {/* Video grid - full width, no padding */}
      {loadingPosts ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-muted-foreground text-center">No videos uploaded yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-px bg-border">
          {posts.map((post) => {
            // Use stored thumbnail URL (video_url field)
            const thumbnailUrl = post.video_url;

            return (
              <div
                key={post.id}
                className="relative aspect-[9/16] bg-muted overflow-hidden cursor-pointer"
                onClick={() => setSelectedPost(post)}
              >
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-muted" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Video player modal */}
      {selectedPost && selectedPost.video_id && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setSelectedPost(null)}
        >
          <button
            onClick={() => setSelectedPost(null)}
            className="absolute right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white"
            style={{ top: 'calc(env(safe-area-inset-top) + 16px)' }}
          >
            <X className="h-6 w-6" />
          </button>
          <iframe
            src={`https://customer-${import.meta.env.VITE_CLOUDFLARE_CUSTOMER_SUBDOMAIN || "f77ppcboel"}.cloudflarestream.com/${selectedPost.video_id}/iframe?autoplay=true&loop=true&muted=false&controls=true`}
            className="w-full h-full max-w-lg"
            style={{ aspectRatio: '9/16', maxHeight: '90vh' }}
            allow="autoplay; fullscreen"
          />
        </div>
      )}
    </div>
  );
}