import { useState, useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Keyboard } from "@capacitor/keyboard";
import { supabase } from "@/integrations/supabase/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import BottomNav from "@/components/BottomNav";
import Challenges from "@/pages/Challenges";
import Feed from "@/pages/Feed";
import Profile from "@/pages/Profile";
import SettingsPage from "@/pages/Settings";
import SettingsTerms from "@/pages/SettingsTerms";
import SettingsRules from "@/pages/SettingsRules";
import SettingsMessages from "@/pages/SettingsMessages";
import PostPage from "@/pages/Post";
import NotFound from "./pages/NotFound";
import Onboarding from "@/pages/Onboarding";
import Setup from "@/pages/Setup";
import Admin from "@/pages/Admin";
import FriendsPage from "@/pages/Friends";
import PublicProfile from "@/pages/PublicProfile";
import AuthCallback from "@/pages/AuthCallback";
import FeatureTour from "@/components/FeatureTour";
import { useAuth, AuthProvider } from "@/contexts/AuthContext";
import { UploadProvider } from "@/contexts/UploadContext";
import UploadIndicator from "@/components/UploadIndicator";
import { useNativeSessionSync } from "@/hooks/useNativeSessionSync";
import logoWhite from "@/assets/logo-white.png";

const queryClient = new QueryClient({});

function AppRoutes() {
  const { user, profile, loading, setProfile } = useAuth();
  const [showTour, setShowTour] = useState(false);

  // Auto-show tour for new users after setup
  useEffect(() => {
    if (profile?.username && localStorage.getItem("show-tour") === "true") {
      setShowTour(true);
    }
  }, [profile?.username]);

  // Listen for replay-tour event from Profile page info button
  useEffect(() => {
    const handleReplayTour = () => setShowTour(true);
    window.addEventListener("replay-tour", handleReplayTour);
    return () => window.removeEventListener("replay-tour", handleReplayTour);
  }, []);

  const handleTourComplete = () => {
    localStorage.removeItem("show-tour");
    setShowTour(false);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: "hsl(var(--primary))" }}>
        <img src={logoWhite} alt="Logo" className="h-16 w-16 animate-pulse" />
      </div>
    );
  }

  // Not signed in → onboarding
  if (!user) {
    return (
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  // Signed in but no username → check if profile is still loading from cache/network
  if (!profile?.username) {
    // If we just finished loading and truly have no profile, show setup
    // But add a brief grace period for cache hydration
    console.log("[AppRoutes] ⚠️ No profile username - profile state:", {
      profileExists: !!profile,
      username: profile?.username,
      userId: user.id
    });
    return (
      <Routes>
        <Route
          path="/setup"
          element={<Setup userId={user.id} onComplete={setProfile} />}
        />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    );
  }

  // Fully authenticated
  return (
    <>
      <Routes>
        <Route path="/" element={<Feed />} />
        <Route path="/challenges" element={<Challenges />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/terms" element={<SettingsTerms />} />
        <Route path="/settings/rules" element={<SettingsRules />} />
        <Route path="/settings/messages" element={<SettingsMessages />} />
        <Route path="/post" element={<PostPage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/profile/:userId" element={<PublicProfile />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/splash-preview" element={
          <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: "hsl(var(--primary))" }}>
            <div className="-mt-16 flex flex-col items-center gap-3">
              <img src="/logo-white.png" alt="" className="h-20 w-20" />
              <h1 className="text-3xl font-extrabold tracking-tight text-white">Rejection Bounty</h1>
            </div>
          </div>
        } />
        <Route path="/onboarding" element={<Navigate to="/" replace />} />
        <Route path="/setup" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
      <UploadIndicator />
      {showTour && <FeatureTour onComplete={handleTourComplete} username={profile?.username ?? undefined} />}
    </>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  const anchorRef = useRef<HTMLDivElement>(null);

  // Disable browser's scroll restoration on mount
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    // Method 1: scrollIntoView on a zero-height anchor (most reliable on iOS WKWebView)
    if (anchorRef.current) {
      anchorRef.current.scrollIntoView({ behavior: 'instant', block: 'start' });
    }

    // Method 2: Traditional scroll resets as fallback
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Method 3: Delayed retry for slow renders
    const raf = requestAnimationFrame(() => {
      anchorRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    });

    const timer = setTimeout(() => {
      anchorRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    }, 50);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [pathname]);

  // Render a zero-height anchor at the very top of the page
  return <div ref={anchorRef} style={{ height: 0, overflow: 'hidden' }} aria-hidden="true" />;
}

function KeyboardSetup() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    Keyboard.setAccessoryBarVisible({ isVisible: false });
  }, []);
  return null;
}

function DeepLinkHandler() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    console.log("[DeepLinkHandler] Setting up appUrlOpen listener");

    const handler = CapApp.addListener("appUrlOpen", async ({ url }) => {
      console.log("[DeepLinkHandler] appUrlOpen received:", url);
      
      try {
        await Browser.close();
        console.log("[DeepLinkHandler] Browser closed");
      } catch (e) {
        console.log("[DeepLinkHandler] Browser.close() error (may already be closed):", e);
      }

      const hashIndex = url.indexOf("#");
      if (hashIndex === -1) {
        console.log("[DeepLinkHandler] No hash fragment in URL");
        return;
      }

      const hash = url.substring(hashIndex + 1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      console.log("[DeepLinkHandler] access_token present:", !!accessToken);
      console.log("[DeepLinkHandler] refresh_token present:", !!refreshToken);

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          console.error("[DeepLinkHandler] setSession error:", error);
        } else {
          console.log("[DeepLinkHandler] Session set successfully!");
        }
      }
    });

    return () => {
      handler.then((h) => h.remove());
    };
  }, []);

  return null;
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" storageKey="app-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
          <UploadProvider>
            <ScrollToTop />
            <KeyboardSetup />
            <DeepLinkHandler />
            <NativeSessionSync />
            <Routes>
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="*" element={
                <div className="mx-auto max-w-lg">
                  <AppRoutes />
                </div>
              } />
            </Routes>
          </UploadProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

/** Mirrors auth session changes to native Preferences storage */
function NativeSessionSync() {
  useNativeSessionSync();
  return null;
}

export default App;
