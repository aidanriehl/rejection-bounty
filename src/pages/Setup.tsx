import { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Camera, X } from "lucide-react";
import { motion } from "framer-motion";
import type { Profile } from "@/hooks/useAuth";

const AVATAR_EMOJIS = [
  "🐶", "🐱", "🐻", "🦊", "🐼", "🐨", "🐯", "🦁",
  "🐸", "🐵", "🐔", "🐧", "🐦", "🦉", "🦄", "🐢",
  "🐙", "🦋", "🌵", "🌻", "🌸", "🍄", "🌿", "🐲",
  "🐰", "🐷", "🐺", "🦎", "🐠", "🦈", "🦩", "🦜",
  "🐳", "🦖", "🐝", "🐞", "🦔", "🐿️", "🦒", "🦘",
  "🦥", "🦦", "🦧", "🐊", "🦀", "🐡", "🦑", "🐛",
  "🌺", "🌼", "🌴", "🍀", "🌈", "⭐", "🌙", "☀️",
  "🍊", "🍋", "🍉", "🥑", "🍕", "🧁", "🎨", "🎸",
];

interface SetupProps {
  userId: string;
  onComplete: (profile: Profile) => void;
}

export default function Setup({ userId, onComplete }: SetupProps) {
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const randomEmoji = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash |= 0;
    }
    return AVATAR_EMOJIS[Math.abs(hash) % AVATAR_EMOJIS.length];
  }, [userId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be under 5MB", variant: "destructive" });
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim().toLowerCase();

    if (trimmed.length < 3) {
      toast({ title: "Username must be at least 3 characters", variant: "destructive" });
      return;
    }
    if (!/^[a-z0-9_]+$/.test(trimmed)) {
      toast({ title: "Only letters, numbers, and underscores", variant: "destructive" });
      return;
    }

    setSaving(true);

    try {
      let profilePhotoUrl: string | null = null;

      if (photoFile) {
        setUploading(true);
        const ext = photoFile.name.split(".").pop() || "jpg";
        const filePath = `${userId}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, photoFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);
        profilePhotoUrl = `${publicUrl}?t=${Date.now()}`;
        setUploading(false);
      }

      const { data, error } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          username: trimmed,
          avatar: randomEmoji,
          ...(profilePhotoUrl ? { profile_photo_url: profilePhotoUrl } : {}),
        })
        .select()
        .single();

      if (error) {
        const msg = error.message.includes("unique")
          ? "That username is taken"
          : "Something went wrong";
        toast({ title: msg, variant: "destructive" });
        setSaving(false);
        return;
      }

      localStorage.setItem("tour_pending", "true");
      onComplete(data as Profile);
      navigate("/challenges");
    } catch (err) {
      console.error("Setup failed:", err);
      toast({ title: "Something went wrong", variant: "destructive" });
      setSaving(false);
      setUploading(false);
    }
  };

  const isValid = username.trim().length >= 3;

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: "hsl(var(--primary))" }}
    >
      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        onSubmit={handleSubmit}
        className="-mt-8 flex w-full max-w-xs flex-col items-center"
      >
        {/* ─── Avatar hero ─── */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.1 }}
          className="relative mb-1"
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group flex h-32 w-32 items-center justify-center rounded-full bg-primary-foreground/10 ring-[3px] ring-primary-foreground/20 overflow-hidden transition-all active:scale-95 hover:ring-primary-foreground/40"
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-5xl">{randomEmoji}</span>
                <Camera className="h-4 w-4 text-primary-foreground/40 transition-colors group-hover:text-primary-foreground/60" />
              </div>
            )}
          </button>

          {/* Remove photo */}
          {photoPreview && (
            <button
              type="button"
              onClick={clearPhoto}
              className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-md"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </motion.div>

        <p className="mb-8 text-xs text-primary-foreground/40">
          {photoPreview ? "Tap to change photo" : "Optional — tap to add a photo"}
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* ─── Username input ─── */}
        <label className="mb-1.5 self-start text-xs font-semibold uppercase tracking-wider text-primary-foreground/50">
          Username
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="@codymaverick"
          maxLength={20}
          autoFocus
          className="mb-6 flex h-14 w-full items-center rounded-2xl border-2 border-primary-foreground/15 bg-primary-foreground/10 px-4 text-center text-lg font-medium text-primary-foreground placeholder:text-primary-foreground/30 focus:border-primary-foreground/40 focus:outline-none transition-colors"
        />

        {/* ─── CTA ─── */}
        <button
          type="submit"
          disabled={!isValid || saving}
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-primary-foreground text-base font-bold text-primary shadow-lg transition-all disabled:opacity-40 active:scale-[0.98]"
        >
          {uploading ? "Uploading photo…" : saving ? "Saving…" : "Finish Setup"}
        </button>
      </motion.form>
    </div>
  );
}
