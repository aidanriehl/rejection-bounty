import { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Camera, X } from "lucide-react";
import type { Profile } from "@/hooks/useAuth";

// Safe, avatar-appropriate emojis — no flags, symbols, weapons, inappropriate items
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

  // Pick a stable random emoji for this user
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

      // Upload photo if selected
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

      const updateData: Record<string, unknown> = {
        id: userId,
        username: trimmed,
        avatar: randomEmoji,
      };
      if (profilePhotoUrl) {
        updateData.profile_photo_url = profilePhotoUrl;
      }

      const { data, error } = await supabase
        .from("profiles")
        .upsert(updateData)
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 -mt-10">
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col items-center gap-6">
        {/* Profile photo picker */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-24 w-24 items-center justify-center rounded-full bg-muted ring-2 ring-border overflow-hidden transition-transform active:scale-95"
            >
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Profile preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-4xl">{randomEmoji}</span>
              )}
            </button>

            {/* Camera badge */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
            >
              <Camera className="h-4 w-4" />
            </button>

            {/* Remove photo button */}
            {photoPreview && (
              <button
                type="button"
                onClick={clearPhoto}
                className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            {photoPreview ? "Tap to change · or remove" : "Add a photo (optional)"}
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Username section */}
        <div className="flex w-full flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold text-foreground">Pick a username</h1>
          <p className="text-sm text-muted-foreground">
            This is how others will see you
          </p>
        </div>

        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="@codymaverick"
          maxLength={20}
          className="h-12 text-center text-lg"
          autoFocus
        />

        <Button
          type="submit"
          size="lg"
          className="h-12 w-full text-base font-semibold"
          disabled={saving || username.trim().length < 3}
        >
          {uploading ? "Uploading photo…" : saving ? "Saving…" : "Let's go 🚀"}
        </Button>
      </form>
    </div>
  );
}
