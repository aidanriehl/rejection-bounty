import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Grid3X3, Camera, ImagePlus, HelpCircle, X, Users, Info } from "lucide-react";
import { motion } from "framer-motion";
import AvatarDisplay from "@/components/AvatarDisplay";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import MilestoneCelebration from "@/components/MilestoneCelebration";
import type { AvatarType, AvatarStage } from "@/lib/mock-data";

const MILESTONES = [10, 50, 100, 150, 200] as const;

export type MedalTier = "bronze" | "silver" | "gold" | "diamond" | "champion";

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
  const totalCompleted = profile?.total_completed ?? 0;
  const photoUrl = profile?.profile_photo_url ?? null;

  // Milestone celebration — check if a new milestone was just reached
  const [celebrateMilestone, setCelebrateMilestone] = useState<{ tier: MedalTier; milestone: number } | null>(null);

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
    <div className="min-h-screen pb-24 pt-8">
      {celebrateMilestone && (
        <MilestoneCelebration
          tier={celebrateMilestone.tier}
          milestone={celebrateMilestone.milestone}
          onDone={() => setCelebrateMilestone(null)}
        />
      )}
      <div className="mx-auto max-w-lg px-4">
        {/* Top bar */}
        <div className="mb-4 flex items-center justify-between">
          <button
            data-tour="why-rejected"
            onClick={() => setShowWhyModal(true)}
            className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors active:bg-muted/70"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Why get rejected?
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                navigate("/challenges");
                setTimeout(() => window.dispatchEvent(new Event("replay-tour")), 300);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full text-foreground"
            >
              <Info className="h-5 w-5" />
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="flex h-9 w-9 items-center justify-center rounded-full text-foreground"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Avatar + username */}
        <div className="mb-6 mt-4 flex flex-col items-center">
          <div
            className="relative inline-flex cursor-pointer select-none"
            onPointerDown={handleLongPressStart}
            onPointerUp={handleLongPressEnd}
            onPointerLeave={handleLongPressEnd}
            onContextMenu={(e) => e.preventDefault()}
            onClick={() => !photoUrl && setShowPhotoMenu(true)}
          >
            <AvatarDisplay
              avatar={avatar}
              stage={avatarStage}
              size="lg"
              photoUrl={photoUrl}
              className="!h-[104px] !w-[104px] !text-5xl"
            />
            {/* IG-style plus badge — only show when no custom photo */}
            {!photoUrl && (
              <div className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary border-[2.5px] border-background shadow-sm">
                <span className="text-xs font-bold text-primary-foreground leading-none">+</span>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handlePhotoUpload} />
          </div>
          {uploading && (
            <p className="mt-1 text-[10px] text-muted-foreground">Uploading…</p>
          )}
          <h1 className="mt-3 text-xl font-extrabold text-foreground">@{profile?.username || "username"}</h1>
          <button
            onClick={() => navigate("/friends")}
            className="mt-2 flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors active:bg-muted/70"
          >
            <Users className="h-3.5 w-3.5" />
            Friends
          </button>
        </div>

        {/* Photo action sheet */}
        {showPhotoMenu && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setShowPhotoMenu(false)}
          >
            <div
              className="w-72 animate-in zoom-in-95 duration-200 rounded-2xl bg-card p-2 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
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
              <div className="mx-3 h-px bg-border" />
              <button
                onClick={() => setShowPhotoMenu(false)}
                className="flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground active:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Why get rejected modal */}
        {showWhyModal && (
          <div
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => setShowWhyModal(false)}
          >
            <div className="fixed inset-0 z-50 flex items-center justify-center pb-[72px] pointer-events-none">
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="pointer-events-auto relative mx-4 max-h-[60vh] w-full max-w-lg rounded-2xl bg-card shadow-xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
              {/* Scroll progress bar */}
              <div className="absolute right-1.5 top-14 bottom-3 w-1 rounded-full bg-muted z-10">
                <motion.div
                  className="w-full rounded-full bg-primary"
                  initial={false}
                  animate={{ height: `${scrollProgress}%` }}
                  transition={{ type: "tween", duration: 0.1 }}
                />
              </div>

              <div
                ref={scrollViewportRef}
                className="max-h-[60vh] overflow-y-auto p-6 pr-5"
                onScroll={(e) => {
                  const el = e.currentTarget;
                  const pct = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
                  setScrollProgress(Math.min(pct, 100));
                }}
              >
              <button
                onClick={() => setShowWhyModal(false)}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground active:bg-muted/70 z-20"
              >
                <X className="h-4 w-4" />
              </button>

              <h2 className="mb-6 text-2xl font-extrabold text-primary leading-tight">
                Why get rejected?
              </h2>

              <div className="space-y-4 text-[15px] leading-relaxed text-foreground/90">
                <p className="font-semibold text-foreground">
                  We live in a world where you never have to experience rejection if you don't want to.
                </p>

                <p>
                  You can remain tongue-tied,<br />
                  stay comfortable,<br />
                  and survive fine.
                </p>

                <p className="text-base font-semibold text-foreground">
                  But we want more in life than that.
                </p>

                <p>
                  Yet it isn't — because our brains still think rejection is dangerous.
                </p>

                <p>
                  You see for most of human history, getting cast out from the social group could be the difference between <strong>life and death.</strong>
                </p>

                <p className="text-primary italic">
                  Now that threat is gone, but the alarm isn't.
                </p>

                <p>
                  And what people don't realize is rejection, confidence, and not giving a f*** is a muscle we can work on just like anything else.
                </p>

                <p className="text-primary italic">
                  We don't realize this, because we never practice it.
                </p>

                <p>
                  Start small, have consistency, and after 100 rejections people will start to ask what changed.
                </p>

                <p className="text-foreground">
                  And remember:
                </p>

                <blockquote className="border-l-4 border-primary pl-4">
                  <p className="text-lg font-bold text-foreground">
                    Danger is real — but fear isn't.<br />
                    It's made up, and we can control it.
                  </p>
                </blockquote>
              </div>
              </div>
              </motion.div>
            </div>
          </div>
        )}

        {/* Stats - 2 column grid */}
        <div className="mb-5 space-y-3">
          {/* Streak */}
          <div className="rounded-2xl border-2 border-foreground/10 bg-card px-4 py-4 shadow-[2px_2px_0px_0px_hsl(var(--foreground)/0.06)]">
            <div className="flex items-center gap-2">
              <span className="text-4xl leading-none flex items-center justify-center" style={{ width: '1em', height: '1em' }}>🔥</span>
              <span className="text-3xl font-extrabold leading-none text-foreground">{streak}</span>
              <span className="text-lg font-semibold leading-none text-foreground">Week Streak</span>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <p className="text-[10px] text-muted-foreground/50">Best Streak: {streak}</p>
              <span className="text-[10px] text-muted-foreground/30">·</span>
              <p className="text-[10px] text-muted-foreground/50 text-right flex-1">0% weeks completed</p>
            </div>
          </div>

          {/* Challenges */}
          <div className="rounded-2xl border-2 border-foreground/10 bg-card px-4 py-4 shadow-[2px_2px_0px_0px_hsl(var(--foreground)/0.06)]">
            <div className="flex items-center gap-2">
              <span className="text-4xl leading-none flex items-center justify-center" style={{ width: '1em', height: '1em' }}>🎯</span>
              <span className="text-3xl font-extrabold leading-none text-foreground">{ms.current}/{ms.goal}</span>
              <span className="text-lg font-semibold leading-none text-foreground">challenges completed</span>
            </div>
            {ms.medal && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <MedalIcon tier={ms.medal.tier} size={16} />
                <span className="text-[10px] font-semibold text-muted-foreground">{ms.medal.label} unlocked!</span>
              </div>
            )}
            <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={false}
                animate={{ width: `${progressPct}%` }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              />
            </div>
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
