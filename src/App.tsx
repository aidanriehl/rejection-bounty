import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import Challenges from "@/pages/Challenges";
import Feed from "@/pages/Feed";
import Profile from "@/pages/Profile";
import SettingsPage from "@/pages/Settings";
import PostPage from "@/pages/Post";
import FriendsPage from "@/pages/Friends";
import NotFound from "./pages/NotFound";
import Onboarding from "@/pages/Onboarding";
import Setup from "@/pages/Setup";
import FeatureTour from "@/components/FeatureTour";
import { useAuth } from "@/hooks/useAuth";

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

  const handleTourComplete = () => {
    localStorage.removeItem("tour_pending");
    setShowTour(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-2xl animate-pulse">🔥</span>
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
        <Route path="/post" element={<PostPage />} />
        <Route path="/friends" element={<FriendsPage />} />
        <Route path="/onboarding" element={<Navigate to="/" replace />} />
        <Route path="/setup" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
      {showTour && <FeatureTour onComplete={handleTourComplete} />}
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="mx-auto max-w-lg">
          <AppRoutes />
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
