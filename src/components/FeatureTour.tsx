import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TourStep {
  title: string;
  description: string;
  highlightSelector?: string;
  tooltipPosition: "top" | "bottom"; // where tooltip appears on screen
}

const STEPS: TourStep[] = [
  {
    title: "Each week we'll assign you 8 challenges",
    description: "Complete 5 of them to beat your week.",
    highlightSelector: '[data-tour="challenge-list"]',
    tooltipPosition: "top", // tooltip at top, challenges at bottom
  },
  {
    title: "Upload challenge videos for prize entries",
    description: "Free users get 1 entry. Subscribers get 2 per challenge + 3 bonus for completing 5 (the max).",
    highlightSelector: '[data-tour="upload-btn"]',
    tooltipPosition: "top", // tooltip at top, upload button below
  },
  {
    title: "Submitting videos should feel uncomfortable",
    description: "But that's the point, discomfort is where you grow.",
    highlightSelector: '[data-tour="upload-btn"]',
    tooltipPosition: "top",
  },
  {
    title: "Number of players",
    description: "People who pay to play on this app are **60% more likely** to complete their challenges.",
    highlightSelector: '[data-tour="players-card"]',
    tooltipPosition: "bottom", // tooltip at bottom, card near top
  },
  {
    title: "The prize pool",
    description: "We put **100% of our profits** into the prize pool. Just a fun reason to complete your challenges.",
    highlightSelector: '[data-tour="prize-pool-card"]',
    tooltipPosition: "bottom",
  },
  {
    title: "Time left to enter the drawing",
    description: "When the countdown ends, a random winner is drawn and a weekly recap is revealed.",
    highlightSelector: '[data-tour="countdown"]',
    tooltipPosition: "bottom", // tooltip at bottom, countdown at top
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

// Parse **bold** markdown in description
function renderDescription(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-bold text-foreground">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export default function FeatureTour({ onComplete }: { onComplete: () => void }) {
  const [showIntro, setShowIntro] = useState(true);
  const [step, setStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<Rect | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const current = STEPS[step];

  // Measure highlighted element - NO scrolling
  const measure = useCallback(() => {
    if (!current.highlightSelector) {
      setHighlightRect(null);
      return;
    }
    const el = document.querySelector(current.highlightSelector);
    if (el) {
      const r = el.getBoundingClientRect();

      // For challenge-list, extend to bottom of screen (above nav bar)
      let height = r.height;
      if (current.highlightSelector === '[data-tour="challenge-list"]') {
        const navBarHeight = 80; // approx bottom nav + safe area
        height = window.innerHeight - r.top - navBarHeight;
      }

      setHighlightRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: height,
      });
    }
  }, [current.highlightSelector]);

  useEffect(() => {
    if (showIntro) return;
    const timeout = setTimeout(measure, 50);
    return () => clearTimeout(timeout);
  }, [step, showIntro, measure]);

  useEffect(() => {
    if (showIntro) return;
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure, showIntro]);

  // Block all interactions except Next button
  useEffect(() => {
    if (showIntro) return;

    const blockInteraction = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-tour-button]')) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
    };

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    document.addEventListener("touchstart", blockInteraction, { capture: true, passive: false });
    document.addEventListener("touchmove", blockInteraction, { capture: true, passive: false });
    document.addEventListener("click", blockInteraction, { capture: true });

    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.removeEventListener("touchstart", blockInteraction, { capture: true });
      document.removeEventListener("touchmove", blockInteraction, { capture: true });
      document.removeEventListener("click", blockInteraction, { capture: true });
    };
  }, [showIntro]);

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handleStart = () => {
    setShowIntro(false);
  };

  // Intro screen
  if (showIntro) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="text-center px-8">
          <span className="text-4xl mb-4 block">✨</span>
          <h1 className="text-2xl font-bold text-primary mb-2">Quick App Demo</h1>
          <p className="text-muted-foreground mb-8">understand how the app works</p>
          <button
            onClick={handleStart}
            className="px-12 py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-lg"
          >
            Start
          </button>
        </div>
      </motion.div>
    );
  }

  // Fixed tooltip positions - never overlap with content
  const getTooltipStyle = (): React.CSSProperties => {
    const padding = 16;

    if (current.tooltipPosition === "top") {
      // Tooltip fixed at top of screen (below safe area)
      return {
        top: 70, // below safe area
        left: padding,
        right: padding,
      };
    } else {
      // Tooltip fixed at bottom of screen (above nav)
      return {
        bottom: 100, // above bottom nav
        left: padding,
        right: padding,
      };
    }
  };

  // Arrow points toward the highlighted element
  const getArrowStyle = (): React.CSSProperties => {
    if (!highlightRect) return { display: "none" };

    // Arrow in center, pointing in the right direction
    if (current.tooltipPosition === "top") {
      // Arrow at bottom of tooltip, pointing down
      return { bottom: -8, left: "50%", transform: "translateX(-50%)" };
    } else {
      // Arrow at top of tooltip, pointing up
      return { top: -8, left: "50%", transform: "translateX(-50%)" };
    }
  };

  const isLastStep = step === STEPS.length - 1;

  return (
    <div ref={overlayRef} className="fixed inset-0 z-[100] pointer-events-none">
      {/* SVG overlay with cutout */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {highlightRect && (
              <rect
                x={highlightRect.left - 8}
                y={highlightRect.top - 8}
                width={highlightRect.width + 16}
                height={highlightRect.height + 16}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.25)"
          mask="url(#tour-mask)"
        />
      </svg>

      {/* Highlight border - no glow */}
      {highlightRect && (
        <div
          className="absolute rounded-xl pointer-events-none"
          style={{
            top: highlightRect.top - 8,
            left: highlightRect.left - 8,
            width: highlightRect.width + 16,
            height: highlightRect.height + 16,
            border: "2px solid hsl(var(--primary))",
          }}
        />
      )}

      {/* Tooltip card - fixed position, never overlaps highlight */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: current.tooltipPosition === "top" ? -20 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="absolute rounded-2xl bg-card shadow-xl px-5 py-4 pointer-events-auto mx-4"
          style={getTooltipStyle()}
        >
          {/* Arrow */}
          <div
            className="absolute w-4 h-4 bg-card rotate-45"
            style={getArrowStyle()}
          />

          {/* Content */}
          <h2 className="text-lg font-bold text-foreground mb-1.5 relative z-10">
            {current.title}
          </h2>
          <p className="text-sm text-muted-foreground mb-4 relative z-10">
            {renderDescription(current.description)}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between relative z-10">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    i < step
                      ? "bg-amber-400"
                      : i === step
                      ? "bg-primary"
                      : "bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>

            <button
              data-tour-button
              onClick={handleNext}
              className="px-6 py-2 rounded-full bg-primary text-primary-foreground font-semibold text-sm"
            >
              {isLastStep ? "Got it! 🎉" : "Next"}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
