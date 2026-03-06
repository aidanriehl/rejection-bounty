import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Keyboard } from "@capacitor/keyboard";
import { supabase } from "@/integrations/supabase/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import FriendsPage from "@/pages/Friends";
import NotFound from "./pages/NotFound";
import Onboarding from "@/pages/Onboarding";
import Setup from "@/pages/Setup";
import Admin from "@/pages/Admin";
import FeatureTour from "@/components/FeatureTour";
import AuthCallback from "@/pages/AuthCallback";
import { useAuth, AuthProvider } from "@/contexts/AuthContext";
import { UploadProvider } from "@/contexts/UploadContext";
import UploadIndicator from "@/components/UploadIndicator";
import { useNativeSessionSync } from "@/hooks/useNativeSessionSync";
import logo from "@/assets/logo.png";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, profile, loading, setProfile } = useAuth();
  const [showTour, setShowTour] = useState(false);

  // React to profile changes — tour_pending is set in Setup before profile updates
  useEffect(() => {
    if (profile?.username && localStorage.getItem("tour_pending") === "true") {
      setShowTour(true);
    }
  }, [profile]);

  // Listen for replay-tour and dismiss-tour custom events
  useEffect(() => {
    const replayHandler = () => setShowTour(true);
    const dismissHandler = () => {
      localStorage.removeItem("tour_pending");
      setShowTour(false);
    };
    window.addEventListener("replay-tour", replayHandler);
    window.addEventListener("dismiss-tour", dismissHandler);
    return () => {
      window.removeEventListener("replay-tour", replayHandler);
      window.removeEventListener("dismiss-tour", dismissHandler);
    };
  }, []);

  const handleTourComplete = () => {
    localStorage.removeItem("tour_pending");
    setShowTour(false);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <img src={logo} alt="Logo" className="h-16 w-16 animate-pulse" />
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

  // Signed in but no username → setup
  if (!profile?.username) {
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
        <Route path="/admin" element={<Admin />} />
        <Route path="/onboarding" element={<Navigate to="/" replace />} />
        <Route path="/setup" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
      <UploadIndicator />
      {showTour && <FeatureTour onComplete={handleTourComplete} />}
    </>
  );
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
