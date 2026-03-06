import { useState, useRef, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Camera, X } from "lucide-react";
import { motion } from "framer-motion";
import { compressImage } from "@/lib/imageUtils";
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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const randomEmoji = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash |= 0;
    }
    return AVATAR_EMOJIS[Math.abs(hash) % AVATAR_EMOJIS.length];
  }, [userId]);

  // Listen for keyboard visibility via visualViewport
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const handleResize = () => {
      // If viewport height is significantly less than window height, keyboard is visible
      const keyboardUp = vv.height < window.innerHeight * 0.75;
      setKeyboardVisible(keyboardUp);
    };

    vv.addEventListener("resize", handleResize);
    return () => vv.removeEventListener("resize", handleResize);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
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
        const compressedBlob = await compressImage(photoFile, 400, 0.8);
        const filePath = `${userId}/avatar.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, compressedBlob, {
            upsert: true,
            contentType: "image/jpeg"
          });
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
      className="fixed inset-0 flex flex-col overflow-auto"
      style={{ backgroundColor: "hsl(var(--primary))" }}
    >
      {/* Scrollable content area */}
      <div className="flex-1 flex flex-col items-center px-6 pt-safe">
        {/* Spacer - shrinks when keyboard appears */}
        <div className={`transition-all duration-200 ${keyboardVisible ? "h-8" : "h-[15vh]"}`} />

        <motion.form
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          onSubmit={handleSubmit}
          className="flex w-full max-w-sm flex-col items-center"
        >
          <h1 className="mb-6 text-2xl font-extrabold tracking-tight text-white">
            Setup Your Account
          </h1>

          {/* Avatar - hide when keyboard visible to save space */}
          <div className={`transition-all duration-200 ${keyboardVisible ? "scale-75 mb-2" : "mb-2"}`}>
            <div className="relative">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-24 w-24 items-center justify-center rounded-full bg-white/20 overflow-hidden transition-transform active:scale-95"
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-5xl">{randomEmoji}</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-primary shadow-lg"
              >
                <Camera className="h-4 w-4" />
              </button>

              {photoPreview && (
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-sm"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <p className="mt-2 text-xs text-white/50 text-center">
              {photoPreview ? "Tap to change" : "(optional)"}
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Username input */}
          <div className="w-full mt-4">
            <p className="mb-2 text-sm font-medium text-white/70 text-center">Pick a username</p>
            <input
              ref={inputRef}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@codymaverick"
              maxLength={20}
              autoCapitalize="off"
              autoCorrect="off"
              className="h-14 w-full rounded-2xl border-2 border-white/20 bg-white/10 px-4 text-center text-lg font-medium text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={!isValid || saving}
            className="mt-4 h-14 w-full rounded-2xl bg-white text-base font-bold text-primary shadow-md transition-opacity disabled:opacity-60"
          >
            {uploading ? "Uploading..." : saving ? "Saving..." : "Let's go"}
          </button>
        </motion.form>

        {/* Bottom padding for safe area */}
        <div className="h-8 pb-safe" />
      </div>
    </div>
  );
}
