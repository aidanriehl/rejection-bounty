import { useState, useEffect, useRef } from "react";
import logoImg from "@/assets/logo-white.png";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import DuoButton from "@/components/DuoButton";
import { supabase } from "@/integrations/supabase/client";

const SPLASH_DURATION = 2200;

function SplashScreen({ onDone }: {onDone: () => void;}) {
  useEffect(() => {
    // Remove the HTML splash now that React has mounted
    const htmlSplash = document.getElementById("native-splash");
    if (htmlSplash) {
      htmlSplash.remove();
    }
    const t = setTimeout(onDone, SPLASH_DURATION);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "hsl(var(--primary))" }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}>
      
      <div className="-mt-16 flex flex-col items-center gap-3 relative overflow-hidden">
        <img src={logoImg} alt="Rejection Bounty" className="h-20 w-20" />
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Rejection Bounty
        </h1>
      </div>
    </motion.div>);

}

function OtpScreen({
  email,
  onBack



}: {email: string;onBack: () => void;}) {
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const verifyingRef = useRef(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, "");

    // iOS autofill might paste full code into first input
    if (digits.length > 1) {
      const code = digits.slice(0, 6);
      setOtp(code);
      const focusIndex = Math.min(code.length, 5);
      inputRefs.current[focusIndex]?.focus();
      return;
    }

    if (!/^\d*$/.test(value)) return;
    const chars = otp.padEnd(6, " ").split("");
    chars[index] = value.slice(-1) || " ";
    const joined = chars.join("").replace(/ +$/, "");
    setOtp(joined);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    setOtp(pasted);
    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const doVerify = async (code: string) => {
    if (code.length !== 6 || verifyingRef.current) return;
    verifyingRef.current = true;
    setVerifying(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email"
      });
      if (error) {
        toast({ title: "Invalid code", description: error.message, variant: "destructive" });
        setOtp("");
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      console.error("[OTP] Error:", err);
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setVerifying(false);
      verifyingRef.current = false;
    }
  };

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (otp.length === 6) {
      doVerify(otp);
    }
  }, [otp]);

  return (
    <motion.div
      key="otp"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center mt-0 mb-[128px]">
      
      <span className="mb-1.5 text-4xl">✉️</span>
      <h2 className="mb-0.5 text-2xl font-bold text-primary-foreground">Enter Your Code</h2>
      <p className="mb-5 text-sm text-primary-foreground/60">Sent to your email.</p>

      {/* OTP input boxes */}
      <div className="mb-3 flex gap-2.5" onPaste={handlePaste}>
        {Array.from({ length: 6 }).map((_, i) =>
        <input
          key={i}
          ref={(el) => {inputRefs.current[i] = el;}}
          type="text"
          inputMode="numeric"
          maxLength={i === 0 ? 6 : 1}
          value={otp[i] || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          disabled={verifying}
          autoFocus={i === 0}
          autoComplete={i === 0 ? "one-time-code" : "off"}
          className="flex h-14 w-11 items-center justify-center rounded-xl border-2 border-primary-foreground/20 bg-primary-foreground/10 text-center text-xl font-bold text-primary-foreground focus:border-primary-foreground/50 focus:outline-none disabled:opacity-50" />

        )}
      </div>

      <DuoButton
        onClick={() => doVerify(otp)}
        disabled={otp.length !== 6 || verifying}
        className="mb-3 max-w-sm">
        {verifying ?
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" /> :
        "Verify"
        }
      </DuoButton>

      <p className="mb-2 text-xs text-primary-foreground/40">
        Didn't get the code? Check your spam folder.
      </p>

      <button
        onClick={onBack}
        className="text-sm font-medium text-primary-foreground/60">
        
        ← Back
      </button>
    </motion.div>);

}

export default function Onboarding() {
  const [showSplash, setShowSplash] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [mode, setMode] = useState<"welcome" | "form">("welcome");
  const [isJoining, setIsJoining] = useState(true);
  const sendingRef = useRef(false);

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      toast({ title: "Please enter your email", variant: "destructive" });
      return;
    }
    if (sendingRef.current) return;
    sendingRef.current = true;
    setLoading(true);
    try {
      if (showPassword && password) {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmed,
          password,
        });
        if (error) {
          toast({ title: "Login failed", description: error.message, variant: "destructive" });
        }
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email: trimmed
        });
        if (error) {
          toast({ title: "Failed to send code", description: error.message, variant: "destructive" });
        } else {
          setSent(true);
        }
      }
    } catch (err) {
      console.error("[Auth] Error:", err);
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
      setTimeout(() => {sendingRef.current = false;}, 3000);
    }
  };

  const handleBack = () => {
    if (sent) {
      setSent(false);
      setEmail("");
    } else {
      setMode("welcome");
      setEmail("");
    }
  };

  return (
    <>
      <AnimatePresence>
        {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      </AnimatePresence>

      {!showSplash &&
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 flex flex-col items-center justify-center px-6 text-center overflow-hidden"
        style={{ backgroundColor: "hsl(var(--primary))" }}>
        
          <AnimatePresence mode="wait">
            {mode === "welcome" && !sent ?
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center -mt-16">
            
                <img src={logoImg} alt="Rejection Bounty" className="mb-4 h-20 w-20" />
                <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-primary-foreground">
                  Rejection Bounty
                </h1>
                <p className="-mt-1 mb-6 text-base text-primary-foreground/60">
                  100 rejections to change your life
                </p>

                <div className="w-full max-w-sm space-y-3 -mt-2">
                  <DuoButton subtle onClick={() => {setIsJoining(true);setMode("form");}}>
                    Join Now
                  </DuoButton>
                  <DuoButton subtle variant="outline" onClick={() => {setIsJoining(false);setMode("form");}}>
                    Log In
                  </DuoButton>
                </div>
              </motion.div> :
          !sent ?
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="items-center flex flex-col mt-0 mb-[135px]">
            
                <span className="mb-3 text-5xl">✉️</span>
                <h1 className="mb-4 text-2xl font-bold text-primary-foreground text-center">
                  {isJoining ? "Join With Your Email!" : "Log in with your email"}
                </h1>

                <div className="w-full max-w-sm space-y-3">
                  <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                disabled={loading}
                autoFocus
                className="flex h-14 w-full items-center rounded-2xl border-2 border-primary-foreground/15 bg-primary-foreground/10 px-4 text-base text-primary-foreground placeholder:text-primary-foreground/40 focus:border-primary-foreground/40 focus:outline-none disabled:opacity-50" />
              
                  <DuoButton onClick={handleSendOtp} disabled={loading}>
                    {loading ?
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" /> :
                    "Continue"
                    }
                  </DuoButton>
                  <p className="text-xs text-primary-foreground/40 pt-[6px]">
                    We'll send a 6-digit code to your email. No password needed.
                  </p>
                  <button
                onClick={handleBack}
                className="text-sm font-medium text-primary-foreground/60">
                
                    ← Back
                  </button>
                </div>
              </motion.div> :

          <OtpScreen email={email} onBack={handleBack} />
          }
          </AnimatePresence>
        </motion.div>
      }
    </>);

}