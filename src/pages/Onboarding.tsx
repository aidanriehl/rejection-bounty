import { lovable } from "@/integrations/lovable";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const SPLASH_DURATION = 2200;

function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, SPLASH_DURATION);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "hsl(var(--primary))" }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="flex flex-col items-center gap-3"
      >
        <span className="text-7xl">🔥</span>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Rejection Bounty
        </h1>
      </motion.div>
    </motion.div>
  );
}

function AuthScreen({ mode, onBack }: { mode: "join" | "login"; onBack: () => void }) {
  const [loading, setLoading] = useState<"google" | "apple" | null>(null);

  const handleSignIn = async (provider: "google" | "apple") => {
    setLoading(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast({
          title: "Sign in failed",
          description: String(result.error),
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-40 flex flex-col bg-background"
    >
      <div className="px-4 pt-4">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full text-foreground"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <span className="mb-4 text-6xl">🔥</span>
        <h1 className="mb-2 text-2xl font-extrabold text-foreground">
          {mode === "join" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mb-10 text-sm text-muted-foreground">
          {mode === "join"
            ? "Sign up to start your rejection journey"
            : "Sign in to continue your streak"}
        </p>

        <div className="flex w-full max-w-sm flex-col gap-3">
          <button
            onClick={() => handleSignIn("google")}
            disabled={loading !== null}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border-2 border-foreground/10 bg-card text-base font-medium text-foreground disabled:opacity-50"
          >
            {loading === "google" ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            Continue with Google
          </button>

          <button
            onClick={() => handleSignIn("apple")}
            disabled={loading !== null}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border-2 border-foreground/10 bg-card text-base font-medium text-foreground disabled:opacity-50"
          >
            {loading === "apple" ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
            )}
            Continue with Apple
          </button>
        </div>

        <p className="mt-8 text-xs text-muted-foreground/60">
          By continuing, you agree to our Terms & Privacy Policy.
        </p>
      </div>
    </motion.div>
  );
}

export default function Onboarding() {
  const [showSplash, setShowSplash] = useState(true);
  const [authScreen, setAuthScreen] = useState<"join" | "login" | null>(null);

  return (
    <>
      <AnimatePresence>
        {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      </AnimatePresence>

      {!showSplash && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
        >
          <span className="mb-4 text-7xl">🔥</span>
          <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-foreground">
            Rejection Bounty
          </h1>
          <p className="mb-8 text-base text-muted-foreground">
            100 rejections will change your life
          </p>

          <div className="w-full max-w-sm space-y-3">
            <button
              onClick={() => setAuthScreen("join")}
              className="flex h-14 w-full items-center justify-center rounded-2xl bg-primary text-base font-bold text-primary-foreground shadow-md"
            >
              Join Now
            </button>
            <button
              onClick={() => setAuthScreen("login")}
              className="flex h-14 w-full items-center justify-center rounded-2xl border-2 border-foreground/15 bg-card text-base font-bold text-foreground"
            >
              Login
            </button>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {authScreen && (
          <AuthScreen
            mode={authScreen}
            onBack={() => setAuthScreen(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
