import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Grid3X3, Camera, ImagePlus } from "lucide-react";
import { motion } from "framer-motion";
import AvatarDisplay from "@/components/AvatarDisplay";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { AvatarType, AvatarStage } from "@/lib/mock-data";

const MILESTONES = [10, 50, 100, 150, 200] as const;

type MedalTier = "bronze" | "silver" | "gold" | "diamond" | "champion";

const MEDAL_COLORS: Record<MedalTier, { fill: string; stroke: string; ribbon: string }> = {
  bronze:   { fill: "#CD7F32", stroke: "#A0522D", ribbon: "#8B4513" },
  silver:   { fill: "#C0C0C0", stroke: "#A8A8A8", ribbon: "#808080" },
  gold:     { fill: "#FFD700", stroke: "#DAA520", ribbon: "#B8860B" },
  diamond:  { fill: "#B9F2FF", stroke: "#7EC8E3", ribbon: "#4A90D9" },
  champion: { fill: "#E8D44D", stroke: "#DAA520", ribbon: "#8B0000" },
};

const MEDALS: Record<number, { tier: MedalTier; label: string }> = {
  10:  { tier: "bronze", label: "Bronze" },
  50:  { tier: "silver", label: "Silver" },
  100: { tier: "gold", label: "Gold" },
  150: { tier: "diamond", label: "Diamond" },
  200: { tier: "champion", label: "Champion" },
};

function MedalIcon({ tier, size = 28 }: { tier: MedalTier; size?: number }) {
  const c = MEDAL_COLORS[tier];
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L16 12L20 2" stroke={c.ribbon} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="16" cy="20" r="10" fill={c.fill} stroke={c.stroke} strokeWidth="1.5" />
      <circle cx="16" cy="20" r="6.5" fill="none" stroke={c.stroke} strokeWidth="0.8" opacity="0.5" />
      <path d="M16 15.5L17.5 18.5L20.5 19L18.2 21.2L18.8 24.5L16 23L13.2 24.5L13.8 21.2L11.5 19L14.5 18.5Z" fill={c.stroke} opacity="0.6" />
    </svg>
  );
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
  const [selectedVideo, setSelectedVideo] = useState<number | null>(null);
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
  const totalCompleted = profile?.total_completed ?? 0;
  const photoUrl = profile?.profile_photo_url ?? null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be under 5MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);
      const urlWithBuster = `${publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ profile_photo_url: urlWithBuster })
        .eq("id", user.id);
      if (updateError) throw updateError;
      setProfile({ ...profile!, profile_photo_url: urlWithBuster });
      toast({ title: "Profile photo updated!" });
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
      </div>
    );
  }

  const ms = getMilestone(totalCompleted);
  const progressPct = Math.min((ms.current / ms.goal) * 100, 100);

  return (
    <div className="min-h-screen pb-24 pt-4">
      <div className="mx-auto max-w-lg px-4">
        {/* Top bar */}
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-extrabold text-foreground">{username}</h1>
          <button
            onClick={() => navigate("/settings")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {/* Avatar */}
        <div className="mb-6 mt-8 flex flex-col items-center">
          <div
            className="relative inline-flex cursor-pointer select-none"
            onPointerDown={handleLongPressStart}
            onPointerUp={handleLongPressEnd}
            onPointerLeave={handleLongPressEnd}
            onContextMenu={(e) => e.preventDefault()}
          >
            <AvatarDisplay
              avatar={avatar}
              stage={avatarStage}
              size="lg"
              photoUrl={photoUrl}
              className="!h-[104px] !w-[104px] !text-5xl"
            />
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handlePhotoUpload} />
          </div>
          {uploading && (
            <p className="mt-1 text-[10px] text-muted-foreground">Uploading…</p>
          )}
        </div>

        {/* Photo action sheet */}
        {showPhotoMenu && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
            onClick={() => setShowPhotoMenu(false)}
          >
            <div
              className="w-full max-w-lg animate-in slide-in-from-bottom-4 duration-200 rounded-t-2xl bg-card p-2 pb-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
              <button
                onClick={() => { setShowPhotoMenu(false); cameraInputRef.current?.click(); }}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground active:bg-muted"
              >
                <Camera className="h-4 w-4 text-muted-foreground" />
                Take Photo
              </button>
              <button
                onClick={() => { setShowPhotoMenu(false); fileInputRef.current?.click(); }}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground active:bg-muted"
              >
                <ImagePlus className="h-4 w-4 text-muted-foreground" />
                Choose from Library
              </button>
              <button
                onClick={() => setShowPhotoMenu(false)}
                className="mt-1 flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground active:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Stats - 2 column grid */}
        <div className="mb-5 space-y-3">
          {/* Streak */}
          <div className="rounded-2xl border-2 border-foreground/10 bg-card px-4 py-4 shadow-[2px_2px_0px_0px_hsl(var(--foreground)/0.06)]">
            <div className="flex items-center gap-1.5">
              <span className="text-lg leading-none">🔥</span>
              <span className="text-3xl font-extrabold text-foreground leading-none">{streak}</span>
              <span className="text-lg font-semibold text-foreground leading-none">Day Streak</span>
            </div>
            <p className="text-[10px] text-muted-foreground/50 mt-1.5">Best Streak: {streak}</p>
          </div>

          {/* Challenges */}
          <div className="rounded-2xl border-2 border-foreground/10 bg-card px-4 py-4 shadow-[2px_2px_0px_0px_hsl(var(--foreground)/0.06)]">
            <div className="flex items-center gap-1.5">
              <span className="text-lg leading-none">🎯</span>
              <span className="text-3xl font-extrabold text-foreground leading-none">{totalCompleted}/{ms.goal}</span>
              <span className="text-lg font-semibold text-foreground leading-none">Challenges Completed</span>
            </div>
            <p className="text-[10px] text-muted-foreground/50 mt-1.5">{totalCompleted >= 5 ? Math.round((Math.floor(totalCompleted / 5) / 52) * 100) : 0}% Weeks Completed</p>
          </div>
        </div>

        {/* Grid icon + divider */}
        <div className="mb-0.5 flex justify-center border-b border-border pb-2">
          <Grid3X3 className="h-5 w-5 text-foreground" />
        </div>

        {/* Empty state for video grid */}
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-muted-foreground text-center">No videos uploaded yet</p>
        </div>
      </div>
    </div>
  );
}
