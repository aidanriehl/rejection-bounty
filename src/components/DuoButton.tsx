import { type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Duolingo-style 3D button with press-down effect, click sound, and haptic feedback.
 * The "3D" look comes from a thick bottom border (shadow layer) that shrinks on active.
 */

function playClick() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const a = new AudioCtx();
    if (a.state === "suspended") a.resume();
    const t = a.currentTime;

    // Subtle keyboard click — very short filtered noise burst
    const bufSize = Math.floor(a.sampleRate * 0.006);
    const buf = a.createBuffer(1, bufSize, a.sampleRate);
    const data = buf.getChannelData(0);
    for (let j = 0; j < bufSize; j++) {
      data[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / bufSize, 16);
    }
    const src = a.createBufferSource();
    src.buffer = buf;
    const hp = a.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1800;
    const lp = a.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 6000;
    const g = a.createGain();
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.008);
    src.connect(hp);
    hp.connect(lp);
    lp.connect(g);
    g.connect(a.destination);
    src.start(t);
    src.stop(t + 0.008);
  } catch {}
}

function haptic() {
  try {
    if (navigator.vibrate) navigator.vibrate(8);
  } catch {}
}

interface DuoButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "outline";
  /** Use reduced 3D depth (e.g. on welcome/splash screens) */
  subtle?: boolean;
}

export default function DuoButton({
  children,
  variant = "primary",
  subtle = false,
  className,
  onClick,
  disabled,
  ...props
}: DuoButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    playClick();
    haptic();
    onClick?.(e);
  };

  const isPrimary = variant === "primary";
  const depth = subtle ? 2 : 4;

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        // Base
        "relative flex w-full items-center justify-center rounded-2xl text-base font-bold transition-all select-none",
        // 3D depth — bottom shadow via box-shadow + transform
        subtle ? "translate-y-0 active:translate-y-[2px]" : "translate-y-0 active:translate-y-[3px]",
        // Sizing
        "h-14",
        // Variants
        isPrimary
          ? subtle
            ? "bg-primary-foreground text-primary shadow-[0_2px_0_0_hsl(0_0%_85%)] active:shadow-[0_1px_0_0_hsl(0_0%_85%)]"
            : "bg-primary-foreground text-primary shadow-[0_4px_0_0_hsl(0_0%_85%)] active:shadow-[0_1px_0_0_hsl(0_0%_85%)]"
          : subtle
            ? "border-2 border-primary-foreground/25 text-primary-foreground shadow-[0_2px_0_0_hsl(160_30%_35%)] active:shadow-[0_1px_0_0_hsl(160_30%_35%)]"
            : "border-2 border-primary-foreground/25 text-primary-foreground shadow-[0_4px_0_0_hsl(160_30%_35%)] active:shadow-[0_1px_0_0_hsl(160_30%_35%)]",
        // Disabled
        isPrimary
          ? subtle
            ? "disabled:opacity-50 disabled:active:translate-y-0 disabled:active:shadow-[0_2px_0_0_hsl(0_0%_85%)]"
            : "disabled:opacity-50 disabled:active:translate-y-0 disabled:active:shadow-[0_4px_0_0_hsl(0_0%_85%)]"
          : subtle
            ? "disabled:opacity-50 disabled:active:translate-y-0 disabled:active:shadow-[0_2px_0_0_hsl(160_30%_35%)]"
            : "disabled:opacity-50 disabled:active:translate-y-0 disabled:active:shadow-[0_4px_0_0_hsl(160_30%_35%)]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
