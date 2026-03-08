import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Grid3X3, Camera, ImagePlus, HelpCircle, ChevronLeft, Info, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { motion } from "framer-motion";
import AvatarDisplay from "@/components/AvatarDisplay";
// import WinnerBanner from "@/components/WinnerBanner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import MilestoneCelebration from "@/components/MilestoneCelebration";
import type { AvatarType, AvatarStage } from "@/lib/mock-data";

interface UserPost {
  id: string;
  video_id: string | null;
  video_url: string | null;
  thumbnail_time: number;
  caption: string;
  likes: number;
  created_at: string;
  challenge_id: string;
  challenge_title?: string;
}

const MILESTONES = [10, 25, 50, 100, 200, 500] as const;

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
  25: { tier: "silver", label: "Silver" },
  50: { tier: "gold", label: "Gold" },
  100: { tier: "diamond", label: "Diamond" },
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

const TIER_EMOJIS: Record<string, string> = {
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
  diamond: "💎",
  champion: "🏆",
};

function getMilestone(completed: number) {
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    if (completed >= MILESTONES[i]) {
      const prev = MILESTONES[i];
      const next = MILESTONES[i + 1];
      if (next) {
        // Progress within tier: reset bar from prev to next
        return { progressCurrent: completed - prev, progressGoal: next - prev, total: completed, nextGoal: next, medal: MEDALS[prev] };
      }
      // Max tier
      return { progressCurrent: 1, progressGoal: 1, total: completed, nextGoal: prev, medal: MEDALS[prev] };
    }
  }
  return { progressCurrent: completed, progressGoal: MILESTONES[0], total: completed, nextGoal: MILESTONES[0], medal: null };
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
      select("id, video_id, video_url, thumbnail_time, caption, likes, created_at, challenge_id").
      eq("user_id", user.id).
      order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch posts:", error);
      }

      // Fetch challenge titles
      const postsData = (data ?? []) as UserPost[];
      const challengeIds = [...new Set(postsData.map(p => p.challenge_id).filter(Boolean))];
      let challengeMap: Record<string, string> = {};
      if (challengeIds.length > 0) {
        const { data: challenges } = await supabase
          .from("challenges")
          .select("id, title")
          .in("id", challengeIds);
        challengeMap = Object.fromEntries((challenges || []).map((c: any) => [c.id, c.title]));
      }

      setPosts(postsData.map(p => ({ ...p, challenge_title: challengeMap[p.challenge_id] || undefined })));
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

  const handleDeletePost = async () => {
    if (!selectedPost || !user) return;
    setDeleting(true);
    const { error } = await supabase.from("posts").delete().eq("id", selectedPost.id).eq("user_id", user.id);
    setDeleting(false);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
      return;
    }
    setPosts((prev) => prev.filter((p) => p.id !== selectedPost.id));
    setShowDeleteConfirm(false);
    setSelectedPost(null);
    toast({ title: "Video deleted" });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>);

  }

  const ms = getMilestone(totalCompleted);
  const progressPct = ms.progressGoal > 0 ? Math.min((ms.progressCurrent / ms.progressGoal) * 100, 100) : 100;

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
        {/* Winner Banner - uncomment when ready for production */}
        {/* <WinnerBanner /> */}

        {/* Top bar */}
        <div className="mb-4 flex items-center justify-between">
          <button
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
        <div className="mb-3 mt-1 flex flex-col items-center">
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
              className="!h-[101px] !w-[101px] !text-[2.75rem]" />

            {!photoUrl &&
            <div className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary border-[2.5px] border-background shadow-sm">
                <span className="text-[10px] font-bold text-primary-foreground leading-none">+</span>
              </div>
            }
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handlePhotoUpload} />
          </div>
          {uploading &&
          <p className="mt-1 text-[10px] text-muted-foreground">Uploading…</p>
          }

          {/* Username */}
          <h1 className="mt-2 translate-y-[3px] font-extrabold text-foreground text-xl">{profile?.username || "username"}</h1>
        </div>

        {/* Stats row */}
        <div className="mb-5 mx-auto grid grid-cols-3 text-center pt-[10px]" style={{ maxWidth: '238px' }}>
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

        {/* Stat cards - 2 columns side by side, wider */}
        <div className="mb-5 grid grid-cols-2 gap-2 px-2">
          {/* Week Streak card */}
          <div className="rounded-2xl border-2 border-foreground/10 bg-card px-3 py-2.5 shadow-[2px_2px_0px_0px_hsl(var(--foreground)/0.06)]">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-base leading-none">🔥</span>
              <span className="text-sm font-bold text-foreground max-[374px]:text-xs">{streak} Week Streak</span>
            </div>
            <div className="mt-1 flex items-center justify-between whitespace-nowrap">
              <span className="text-[10px] text-muted-foreground max-[374px]:text-[9px]">Longest: {bestStreak}</span>
              <span className="text-[10px] text-muted-foreground max-[374px]:text-[9px]">Win Rate: {weeksSinceSignup > 0 ? Math.round(weeksCompleted / weeksSinceSignup * 100) : 0}%</span>
            </div>
          </div>

          {/* Challenges Completed card */}
          <div className="rounded-2xl border-2 border-foreground/10 bg-card px-3 py-2.5 shadow-[2px_2px_0px_0px_hsl(var(--foreground)/0.06)]">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-base leading-none">{ms.medal ? TIER_EMOJIS[ms.medal.tier] : "✅"}</span>
              <span className="text-sm font-bold text-foreground max-[374px]:text-xs">{ms.total}/{ms.nextGoal} Challenges</span>
              {ms.medal && <MedalIcon tier={ms.medal.tier} size={14} />}
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-2 w-full bg-muted overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>

        {/* Grid icon + divider */}
        <div className="mb-0.5 mt-6 flex justify-center border-b border-border pb-2">
          <Grid3X3 className="h-5 w-5 text-foreground" />
        </div>
      </div>

      {/* Video grid - full width */}
      <div className="w-full">
        {loadingPosts ?
        <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div> :
        posts.length === 0 ?
        <div className="flex items-center justify-center py-16">
            <p className="text-sm text-muted-foreground text-center">No videos uploaded yet</p>
          </div> :

        <div className="grid grid-cols-3 gap-0.5">
            {posts.map((post) => {
            // Use stored thumbnail URL (video_url field), fallback to Cloudflare generated
            const customerSubdomain = import.meta.env.VITE_CLOUDFLARE_CUSTOMER_SUBDOMAIN || "ekqzy78t2m50j1d7";
            const thumbnailUrl = post.video_url || (post.video_id ?
            `https://customer-${customerSubdomain}.cloudflarestream.com/${post.video_id}/thumbnails/thumbnail.jpg?time=${post.thumbnail_time || 0}s` :
            null);

            return (
              <div
                key={post.id}
                className="relative aspect-[9/16] bg-muted overflow-hidden cursor-pointer"
                onClick={() => setSelectedPost(post)}>
                
                  {thumbnailUrl ?
                <img
                  src={thumbnailUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }} /> :


                <div className="h-full w-full bg-muted" />
                }
                </div>);

          })}
          </div>
        }
      </div>

      {/* Video player modal - matches Feed UI */}
      {selectedPost && selectedPost.video_id && (
        <div className="fixed inset-0 z-50 bg-black">
          {/* Video */}
          <iframe
            src={`https://customer-${import.meta.env.VITE_CLOUDFLARE_CUSTOMER_SUBDOMAIN || "ekqzy78t2m50j1d7"}.cloudflarestream.com/${selectedPost.video_id}/iframe?autoplay=true&loop=true&muted=false&controls=false`}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; fullscreen"
            style={{ border: "none" }}
          />

          {/* Back button - top left */}
          <button
            onClick={() => setSelectedPost(null)}
            className="absolute left-4 z-10 flex h-10 w-10 items-center justify-center text-white"
            style={{ top: 'calc(env(safe-area-inset-top) + 24px)' }}
          >
            <ChevronLeft className="h-8 w-8" />
          </button>

          {/* Delete button - top right, aligned with back button */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="absolute right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white/75 active:text-red-400"
            style={{ top: 'calc(env(safe-area-inset-top) + 24px)' }}
          >
            <Trash2 className="h-[18px] w-[18px]" />
          </button>

          {/* Bottom gradient */}
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

          {/* Bottom info */}
          <div
            className="absolute left-4 right-4"
            style={{ bottom: 'calc(3rem + env(safe-area-inset-bottom) + 32px)' }}
          >
            <div className="flex items-center gap-3 mb-2.5">
              <AvatarDisplay avatar={avatar} stage={avatarStage} size="sm" />
              <span className="text-base font-bold text-white drop-shadow-md">@{username}</span>
            </div>
            <p className="text-xs text-white/50 drop-shadow-md mb-1.5">{selectedPost.likes} likes</p>
            {selectedPost.challenge_title && (
              <p className="text-xs font-semibold text-white/70 drop-shadow-md mb-1">{selectedPost.challenge_title}</p>
            )}
            {selectedPost.caption && (
              <p className="text-sm text-white/90 drop-shadow-md">{selectedPost.caption}</p>
            )}
          </div>

          {/* Delete confirmation overlay */}
          {showDeleteConfirm && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60" style={{ bottom: 0 }}>
              <div className="mx-10 w-full max-w-[260px] rounded-2xl bg-card p-4 text-center shadow-xl -mt-16">
                <Trash2 className="mx-auto mb-2 h-6 w-6 text-destructive" />
                <h3 className="text-sm font-bold text-foreground mb-0.5">Delete this video?</h3>
                <p className="text-xs text-muted-foreground mb-4">This action can't be undone.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 rounded-xl bg-muted py-2.5 text-sm font-semibold text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeletePost}
                    disabled={deleting}
                    className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground disabled:opacity-50"
                  >
                    {deleting ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>);

}