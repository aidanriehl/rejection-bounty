import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Globe, Lock, LogOut, ChevronRight, User, Camera, KeyRound, Bell, CircleHelp, FileText, Trash2, Banknote, CheckCircle, Loader2, Moon, Scale } from "lucide-react";
import AvatarDisplay from "@/components/AvatarDisplay";
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
  const [showRules, setShowRules] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();

  // Stripe Connect state
  const [connectStatus, setConnectStatus] = useState<{
    connected: boolean;
    onboarding_complete?: boolean;
    payouts_enabled?: boolean;
    email?: string;
  } | null>(null);
  const [connectLoading, setConnectLoading] = useState(true);
  const [connectLinking, setConnectLinking] = useState(false);

  // Check connect status on mount & after returning from Stripe
  useEffect(() => {
    checkConnectStatus();
  }, []);

  useEffect(() => {
    if (searchParams.get("connect") === "complete") {
      checkConnectStatus();
    }
  }, [searchParams]);

  const checkConnectStatus = async () => {
    setConnectLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-connect-status");
      if (error) throw error;
      setConnectStatus(data);
    } catch (e) {
      console.error("Failed to check connect status:", e);
      setConnectStatus({ connected: false });
    } finally {
      setConnectLoading(false);
    }
  };

  const startConnectOnboarding = async () => {
    setConnectLinking(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-connect-account");
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error("Failed to start connect onboarding:", e);
      toast({ title: "Error", description: "Failed to start bank linking. Please try again.", variant: "destructive" });
    } finally {
      setConnectLinking(false);
    }
  };

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
      toast({ title: "Failed to update name", variant: "destructive" });
      return;
    }

    setAuthProfile(data as any);
    setEditingName(false);
  };

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
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const urlWithBuster = `${publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase.from("profiles").update({ profile_photo_url: urlWithBuster }).eq("id", user.id);
      if (updateError) throw updateError;
      setAuthProfile({ ...authProfile!, profile_photo_url: urlWithBuster });
      toast({ title: "Profile photo updated!" });
    } catch (err) {
      console.error("Upload failed:", err);
      toast({ title: "Failed to upload photo", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Display Name</span>
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
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Display Name</span>
              </div>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                {authProfile?.username || "Set name"}
                <ChevronRight className="h-4 w-4" />
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
              <Camera className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Profile Photo</span>
            </div>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              {uploading ? "Uploading…" : "Edit"}
              <ChevronRight className="h-4 w-4" />
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />
        </div>


        {/* Preferences Section */}
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preferences</p>
        <div className="mb-5 overflow-hidden rounded-xl border bg-card">
          {/* Privacy */}
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <span className="text-sm font-medium text-foreground">
                  {isPublic ? "Public Profile" : "Private Profile"}
                </span>
                <p className="text-xs text-muted-foreground">
                  {isPublic ? "Anyone can see your profile" : "Only friends can see your profile"}
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
              <Bell className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="text-sm font-medium text-foreground">Notifications</span>
                <p className="text-xs text-muted-foreground">Weekly reminders & friend activity</p>
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
              <Moon className="h-4 w-4 text-muted-foreground" />
              <div>
                <span className="text-sm font-medium text-foreground">Dark Mode</span>
                <p className="text-xs text-muted-foreground">Switch between light and dark themes</p>
              </div>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
          </div>
        </div>

        {/* Payouts Section */}
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payouts</p>
        <div className="mb-5 overflow-hidden rounded-xl border bg-card">
          {connectLoading ? (
            <div className="flex items-center gap-3 px-4 py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Checking payout status…</span>
            </div>
          ) : connectStatus?.onboarding_complete && connectStatus?.payouts_enabled ? (
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <span className="text-sm font-medium text-foreground">Bank Account Linked</span>
                  <p className="text-xs text-muted-foreground">
                    You're eligible for weekly prize payouts
                  </p>
                </div>
              </div>
              <button
                onClick={startConnectOnboarding}
                className="text-xs font-semibold text-primary"
              >
                Update
              </button>
            </div>
          ) : connectStatus?.connected && !connectStatus?.onboarding_complete ? (
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <Banknote className="h-4 w-4 text-yellow-500" />
                <div>
                  <span className="text-sm font-medium text-foreground">Onboarding Incomplete</span>
                  <p className="text-xs text-muted-foreground">Finish linking your bank account</p>
                </div>
              </div>
              <button
                onClick={startConnectOnboarding}
                disabled={connectLinking}
                className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background disabled:opacity-50"
              >
                {connectLinking ? "Loading…" : "Continue"}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <Banknote className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-sm font-medium text-foreground">Link Bank Account</span>
                  <p className="text-xs text-muted-foreground">
                    Required to receive weekly prize pool winnings
                  </p>
                </div>
              </div>
              <button
                onClick={startConnectOnboarding}
                disabled={connectLinking}
                className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background disabled:opacity-50"
              >
                {connectLinking ? "Loading…" : "Link"}
              </button>
            </div>
          )}
        </div>

        {/* Subscription */}
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subscription</p>
        <div className="mb-5 flex items-center justify-between rounded-xl border bg-card p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Premium Subscription</p>
            <p className="text-xs text-muted-foreground">Unlock all features & enter the weekly drawing</p>
          </div>
          <button className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background">
            Subscribe
          </button>
        </div>

        {/* Support */}
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Support</p>
        <div className="mb-5 overflow-hidden rounded-xl border bg-card">
          <button
            onClick={() => setShowTerms(!showTerms)}
            className="flex w-full items-center justify-between border-b px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Terms & Privacy</span>
            </div>
            <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${showTerms ? "rotate-90" : ""}`} />
          </button>
          {showTerms && (
            <div className="border-b px-4 py-4 text-xs text-muted-foreground leading-relaxed space-y-3">
              <p className="font-bold text-foreground text-sm">TERMS & PRIVACY</p>
              <p className="text-xs text-muted-foreground">Last Updated: March 5, 2026</p>

              <p className="font-bold text-foreground text-sm mt-4">TERMS OF SERVICE</p>
              <p><span className="font-semibold text-foreground">1. Acceptance:</span> By using Rejection Bounty, you agree to these terms.</p>
              <p><span className="font-semibold text-foreground">2. Eligibility:</span> You must be 13 years or older to use this app.</p>
              <p><span className="font-semibold text-foreground">3. Account:</span> You are responsible for maintaining the security of your account and all activity under it.</p>
              <p><span className="font-semibold text-foreground">4. Content:</span> You retain ownership of videos you upload. By uploading, you grant us a license to display your content within the app. You agree not to upload illegal, harmful, or inappropriate content.</p>
              <p><span className="font-semibold text-foreground">5. Subscriptions:</span> Paid subscriptions are billed through Apple. You can cancel anytime through your Apple ID settings. Refunds are handled by Apple per their policies.</p>
              <p><span className="font-semibold text-foreground">6. Weekly Drawing:</span> Participation in the weekly drawing is subject to the Official Sweepstakes Rules below. No purchase necessary to enter.</p>
              <p><span className="font-semibold text-foreground">7. Payouts:</span> Prize winners must link a valid bank account via Stripe to receive payouts. We are not responsible for delays caused by incorrect banking information.</p>
              <p><span className="font-semibold text-foreground">8. Termination:</span> We may suspend or terminate accounts that violate these terms.</p>
              <p><span className="font-semibold text-foreground">9. Disclaimers:</span> The app is provided "as is." We make no guarantees about availability or results from using the app.</p>

              <hr className="border-border my-3" />

              <p className="font-bold text-foreground text-sm">PRIVACY POLICY</p>
              <p><span className="font-semibold text-foreground">1. Introduction:</span> Rejection Bounty ("we," "our," or "us") respects your privacy. This policy explains how we collect, use, and protect your information.</p>
              <p><span className="font-semibold text-foreground">2. Information We Collect:</span></p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Email address (used for magic link sign-in)</li>
                <li>Username and profile photo</li>
                <li>Videos and content you upload</li>
                <li>Payment information (processed securely by Stripe)</li>
                <li>Basic app usage analytics</li>
              </ul>
              <p><span className="font-semibold text-foreground">3. How We Use Your Information:</span></p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Create and manage your account</li>
                <li>Display your profile and content to other users</li>
                <li>Process payments and prize payouts</li>
                <li>Improve the app experience</li>
              </ul>
              <p><span className="font-semibold text-foreground">4. Information Sharing:</span> We do not sell your personal information. We share data only with service providers (Supabase, Stripe, Apple) as necessary to operate the app.</p>
              <p><span className="font-semibold text-foreground">5. Data Security:</span> We use industry-standard security measures including encrypted connections and secure authentication.</p>
              <p><span className="font-semibold text-foreground">6. Your Rights:</span> You may access, update, or delete your account data by contacting us at replacedplastics@gmail.com.</p>
            </div>
          )}
          <button
            onClick={() => setShowRules(!showRules)}
            className="flex w-full items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <Scale className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Official Sweepstakes Rules</span>
            </div>
            <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${showRules ? "rotate-90" : ""}`} />
          </button>
          {showRules && (
            <div className="border-t px-4 py-4 text-xs text-muted-foreground leading-relaxed space-y-3">
              <p className="font-bold text-foreground text-sm">OFFICIAL SWEEPSTAKES RULES</p>
              <p className="font-semibold text-foreground">NO PURCHASE NECESSARY TO ENTER OR WIN.</p>
              <p><span className="font-semibold text-foreground">1. Eligibility:</span> Open to users 13 years or older.</p>
              <p><span className="font-semibold text-foreground">2. How to Enter (Free):</span> Complete at least one challenge with a video upload during the weekly period to receive one (1) free entry.</p>
              <p><span className="font-semibold text-foreground">3. Bonus Entries (Subscribers):</span> Paid subscribers receive 1 entry per challenge completed with video (up to 4 entries for 4 challenges). Completing 5 or more challenges earns 8 total entries. Maximum entries per week: 13 tickets.</p>
              <p><span className="font-semibold text-foreground">4. Drawing Period:</span> Weekly, ending Sunday at midnight.</p>
              <p><span className="font-semibold text-foreground">5. Winner Selection:</span> One winner selected randomly each week from all eligible entries. Each entry has an equal chance of winning.</p>
              <p><span className="font-semibold text-foreground">6. Prize:</span> Weekly prize amount varies based on the community pool. Winner will be notified in-app.</p>
              <p><span className="font-semibold text-foreground">7. Odds:</span> Depend on the total number of entries received.</p>
              <p><span className="font-semibold text-foreground">8. Sponsor:</span> Rejection Bounty. Apple Inc. is not a sponsor and is not responsible for this promotion.</p>
              <p><span className="font-semibold text-foreground">9. General:</span> Void where prohibited by law.</p>
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="mb-4 overflow-hidden rounded-xl border bg-card">
          <button
            onClick={async () => {
              await signOut();
              navigate("/");
            }}
            className="flex w-full items-center gap-3 border-b px-4 py-3 text-sm font-medium text-foreground"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" />
            Log Out
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-destructive">
                <Trash2 className="h-4 w-4" />
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
    </div>
  );
}
