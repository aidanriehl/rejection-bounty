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

    // Short, bright "pop" — a quick sine blip
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(900, t);
    o.frequency.exponentialRampToValueAtTime(600, t + 0.04);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    o.connect(g);
    g.connect(a.destination);
    o.start(t);
    o.stop(t + 0.06);

    // Tiny noise transient for tactile feel
    const buf = a.createBuffer(1, a.sampleRate * 0.012, a.sampleRate);
    const data = buf.getChannelData(0);
    for (let j = 0; j < buf.length; j++) {
      data[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / buf.length, 10);
    }
    const src = a.createBufferSource();
    src.buffer = buf;
    const ng = a.createGain();
    ng.gain.setValueAtTime(0.08, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.015);
    src.connect(ng);
    ng.connect(a.destination);
    src.start(t);
    src.stop(t + 0.015);
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
}

export default function DuoButton({
  children,
  variant = "primary",
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

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        // Base
        "relative flex w-full items-center justify-center rounded-2xl text-base font-bold transition-all select-none",
        // 3D depth — bottom shadow via box-shadow + transform
        "translate-y-0 active:translate-y-[3px]",
        // Sizing
        "h-14",
        // Variants
        isPrimary
          ? "bg-primary-foreground text-primary shadow-[0_4px_0_0_rgba(0,0,0,0.15)] active:shadow-[0_1px_0_0_rgba(0,0,0,0.15)]"
          : "border-2 border-primary-foreground/25 text-primary-foreground shadow-[0_4px_0_0_rgba(255,255,255,0.08)] active:shadow-[0_1px_0_0_rgba(255,255,255,0.08)]",
        // Disabled
        "disabled:opacity-50 disabled:active:translate-y-0 disabled:active:shadow-[0_4px_0_0_rgba(0,0,0,0.15)]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
