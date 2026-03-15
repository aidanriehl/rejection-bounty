import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Globe, Lock, LogOut, ChevronRight, User, Camera, Bell, FileText, Trash2, Loader2, Moon, Scale, MessageCircle } from "lucide-react";
import AvatarDisplay from "@/components/AvatarDisplay";
import ImageCropper from "@/components/ImageCropper";
import { type AvatarType } from "@/lib/mock-data";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "next-themes";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SettingsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile: authProfile, signOut, setProfile: setAuthProfile } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  
  // Keep nameValue in sync with profile data
  useEffect(() => {
    if (authProfile?.username) {
      setNameValue(authProfile.username);
    }
  }, [authProfile?.username]);
  const [isPublic, setIsPublic] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();

  const saveName = async () => {
    if (!user) return;
    const trimmed = nameValue.trim();
    if (!trimmed) return;

    const { data, error } = await supabase
      .from("profiles")
      .update({ username: trimmed })
      .eq("id", user.id)
      .select()
      .single();

    if (error) {
      const msg = error.message.includes("unique")
        ? "That username is taken"
        : "Failed to update name";
      toast({ title: msg, variant: "destructive" });
      return;
    }

    setAuthProfile(data as any);
    setEditingName(false);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    // Convert to data URL and show cropper
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
    };
    reader.readAsDataURL(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCroppedImageUpload = async (croppedBlob: Blob) => {
    if (!user) return;
    setImageToCrop(null);
    setUploading(true);
    try {
      const filePath = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, croppedBlob, { upsert: true, contentType: "image/jpeg" });
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
      setAuthProfile({ ...authProfile!, profile_photo_url: urlWithBuster });
      // Notify other components (e.g., Feed) to refresh
      window.dispatchEvent(new Event("profile-updated"));
    } catch (err) {
      console.error("Upload failed:", err);
      toast({ title: "Failed to upload photo", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 pt-4">
      <div className="mx-auto max-w-lg px-4">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate("/profile")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        </div>

        {/* Account Section */}
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account</p>
        <div className="mb-5 overflow-hidden rounded-xl border bg-card">
          {/* Display Name */}
          {editingName ? (
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-3">
                <User className="h-[18px] w-[18px] text-muted-foreground" />
                <span className="text-[15px] font-medium text-foreground">Display Name</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  className="w-32 rounded-lg border bg-muted/30 px-2 py-1 text-right text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && saveName()}
                />
                <button onClick={saveName} className="text-xs font-semibold text-primary">Save</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setEditingName(true)} className="flex w-full items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-3">
                <User className="h-[18px] w-[18px] text-muted-foreground" />
                <span className="text-[15px] font-medium text-foreground">Display Name</span>
              </div>
              <span className="flex items-center gap-1 text-[15px] text-muted-foreground">
                {authProfile?.username || "Set name"}
                <ChevronRight className="h-[18px] w-[18px]" />
              </span>
            </button>
          )}

          {/* Profile Photo */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex w-full items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <Camera className="h-[18px] w-[18px] text-muted-foreground" />
              <span className="text-[15px] font-medium text-foreground">Profile Photo</span>
            </div>
            <span className="flex items-center gap-1 text-[15px] text-muted-foreground">
              {uploading ? "Uploading…" : "Edit"}
              <ChevronRight className="h-[18px] w-[18px]" />
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoSelect}
          />
        </div>


        {/* Preferences Section */}
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preferences</p>
        <div className="mb-5 overflow-hidden rounded-xl border bg-card">
          {/* Privacy */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe className="h-[18px] w-[18px] text-muted-foreground" />
              ) : (
                <Lock className="h-[18px] w-[18px] text-muted-foreground" />
              )}
              <div>
                <span className="text-[15px] font-medium text-foreground">
                  {isPublic ? "Public Profile" : "Private Profile"}
                </span>
                <p className="text-[13px] text-muted-foreground">
                  {isPublic ? "Anyone can see your profile" : "Only followers can see your profile"}
                </p>
              </div>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-3">
              <Bell className="h-[18px] w-[18px] text-muted-foreground" />
              <div>
                <span className="text-[15px] font-medium text-foreground">Notifications</span>
                <p className="text-[13px] text-muted-foreground">Weekly reminders & friend activity</p>
              </div>
            </div>
            <Switch
              checked={notifications}
              onCheckedChange={setNotifications}
            />
          </div>
          {/* Dark Mode */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Moon className="h-[18px] w-[18px] text-muted-foreground" />
              <div>
                <span className="text-[15px] font-medium text-foreground">Dark Mode</span>
                <p className="text-[13px] text-muted-foreground">Switch between light and dark themes</p>
              </div>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
          </div>
        </div>

        {/* Subscription */}
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subscription</p>
        <div className="mb-5 flex items-center justify-between rounded-xl border bg-card p-4">
          <div>
            <p className="text-[15px] font-semibold text-foreground">Premium Subscription</p>
            <p className="text-[13px] text-muted-foreground">100 rejections to change your life</p>
          </div>
          <button className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background">
            Subscribe
          </button>
        </div>

        {/* Support */}
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Support</p>
        <div className="mb-5 overflow-hidden rounded-xl border bg-card">
          <button
            onClick={() => navigate("/settings/messages")}
            className="flex w-full items-center justify-between border-b px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <MessageCircle className="h-[18px] w-[18px] text-muted-foreground" />
              <span className="text-[15px] font-medium text-foreground">Message Admin</span>
            </div>
            <ChevronRight className="h-[18px] w-[18px] text-muted-foreground" />
          </button>
          <button
            onClick={() => navigate("/settings/terms")}
            className="flex w-full items-center justify-between border-b px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-[18px] w-[18px] text-muted-foreground" />
              <span className="text-[15px] font-medium text-foreground">Terms & Privacy</span>
            </div>
            <ChevronRight className="h-[18px] w-[18px] text-muted-foreground" />
          </button>
          <button
            onClick={() => navigate("/settings/rules")}
            className="flex w-full items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <Scale className="h-[18px] w-[18px] text-muted-foreground" />
              <span className="text-[15px] font-medium text-foreground">Official Sweepstakes Rules</span>
            </div>
            <ChevronRight className="h-[18px] w-[18px] text-muted-foreground" />
          </button>
        </div>

        {/* Danger Zone */}
        <div className="mb-4 overflow-hidden rounded-xl border bg-card">
          <button
            onClick={async () => {
              await signOut();
              navigate("/");
            }}
            className="flex w-full items-center gap-3 border-b px-4 py-3 text-[15px] font-medium text-foreground"
          >
            <LogOut className="h-[18px] w-[18px] text-muted-foreground" />
            Log Out
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-destructive">
                <Trash2 className="h-[18px] w-[18px]" />
                Delete Account
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Account</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. Your account and all data will be permanently deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={async () => {
                    try {
                      const { error } = await supabase.functions.invoke("delete-account");
                      if (error) throw error;
                    } catch (e) {
                      console.error("Failed to delete account:", e);
                    }
                    await signOut();
                    navigate("/");
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Image cropper */}
      {imageToCrop && (
        <ImageCropper
          imageSrc={imageToCrop}
          onCropComplete={handleCroppedImageUpload}
          onCancel={() => setImageToCrop(null)}
        />
      )}
    </div>
  );
}
