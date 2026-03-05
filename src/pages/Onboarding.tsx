import { useState, useEffect } from "react";
import logoImg from "@/assets/logo.png";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

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
        className="-mt-16 flex flex-col items-center gap-3"
      >
        <img src={logoImg} alt="Rejection Bounty" className="h-20 w-20" />
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Rejection Bounty
        </h1>
      </motion.div>
    </motion.div>
  );
}

export default function Onboarding() {
  const [showSplash, setShowSplash] = useState(true);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSendMagicLink = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      toast({ title: "Please enter your email", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        toast({ title: "Failed to send link", description: error.message, variant: "destructive" });
      } else {
        setSent(true);
      }
    } catch (err) {
      console.error("[MagicLink] Error:", err);
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

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
          className="fixed inset-0 flex flex-col items-center justify-center px-6 text-center"
          style={{ backgroundColor: "hsl(var(--primary))" }}
        >
          <div className="-mt-20 flex flex-col items-center">
            <img src={logoImg} alt="Rejection Bounty" className="mb-4 h-20 w-20" />
            <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-primary-foreground">
              Rejection Bounty
            </h1>
            <p className="mb-6 text-base text-primary-foreground/60">
              100 rejections will change your life
            </p>
          </div>

          <div className="w-full max-w-sm space-y-4">
            <AnimatePresence mode="wait">
              {!sent ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMagicLink()}
                    disabled={loading}
                    className="flex h-14 w-full items-center rounded-2xl border-2 border-primary-foreground/15 bg-primary-foreground/10 px-4 text-base text-primary-foreground placeholder:text-primary-foreground/40 focus:border-primary-foreground/40 focus:outline-none disabled:opacity-50"
                  />
                  <button
                    onClick={handleSendMagicLink}
                    disabled={loading}
                    className="flex h-14 w-full items-center justify-center rounded-2xl bg-primary-foreground text-base font-bold text-primary shadow-md disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      "Send Magic Link"
                    )}
                  </button>
                  <p className="pt-2 text-xs text-primary-foreground/40">
                    We'll send a sign-in link to your email. No password needed.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="sent"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-3"
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-4xl">✉️</span>
                    <h2 className="text-xl font-bold text-primary-foreground">Check your inbox</h2>
                    <p className="text-sm text-primary-foreground/60">
                      We sent a magic link to <span className="font-medium text-primary-foreground/80">{email}</span>
                    </p>
                    <p className="text-xs text-primary-foreground/40">
                      Click the link in the email to sign in.
                    </p>
                  </div>
                  <button
                    onClick={() => { setSent(false); setEmail(""); }}
                    className="pt-2 text-sm font-medium text-primary-foreground/60"
                  >
                    Use a different email
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </>
  );
}
