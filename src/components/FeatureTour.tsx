import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TourStep {
  title: string;
  description: string;
  highlightSelector?: string;
  arrowPosition?: "top" | "bottom";
}

const STEPS: TourStep[] = [
  {
    title: "Each week we'll assign you 8 challenges",
    description: "Complete 5 of them to beat your week.",
    highlightSelector: '[data-tour="challenge-list"]',
    arrowPosition: "top",
  },
  {
    title: "Upload challenge videos for prize entries",
    description: "Free users get 1 entry. Subscribers get 2 per challenge + 3 bonus for completing 5 (the max).",
    highlightSelector: '[data-tour="upload-btn"]',
    arrowPosition: "top",
  },
  {
    title: "Submitting videos should feel uncomfortable",
    description: "But that's the point, discomfort is where you grow.",
    highlightSelector: '[data-tour="upload-btn"]',
    arrowPosition: "top",
  },
  {
    title: "Number of players",
    description: "People who pay to play on this app are **60% more likely** to complete their challenges.",
    highlightSelector: '[data-tour="players-card"]',
    arrowPosition: "bottom",
  },
  {
    title: "The prize pool",
    description: "We put **100% of our profits** into the prize pool. Just a fun reason to complete your challenges.",
    highlightSelector: '[data-tour="prize-pool-card"]',
    arrowPosition: "bottom",
  },
  {
    title: "Time left to enter the drawing",
    description: "When the countdown ends, a random winner is drawn and a weekly recap is revealed.",
    highlightSelector: '[data-tour="countdown"]',
    arrowPosition: "bottom",
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

  // Measure highlighted element
  const measure = useCallback(() => {
    if (!current.highlightSelector) {
      setHighlightRect(null);
      return;
    }
    const el = document.querySelector(current.highlightSelector);
    if (el) {
      const r = el.getBoundingClientRect();
      setHighlightRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
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
      // Allow clicks on the Next/Got it button
      if (target.closest('[data-tour-button]')) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
    };

    // Block scroll
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    // Block touch/click events
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

  // Calculate tooltip position
  const getTooltipStyle = () => {
    if (!highlightRect) {
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }

    const padding = 16;
    const tooltipWidth = 320;

    if (current.arrowPosition === "top") {
      // Tooltip below the highlighted element
      return {
        top: highlightRect.top + highlightRect.height + 20,
        left: Math.max(padding, Math.min(highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding)),
      };
    } else {
      // Tooltip above the highlighted element
      return {
        bottom: window.innerHeight - highlightRect.top + 20,
        left: Math.max(padding, Math.min(highlightRect.left + highlightRect.width / 2 - tooltipWidth / 2, window.innerWidth - tooltipWidth - padding)),
      };
    }
  };

  // Calculate arrow position
  const getArrowStyle = () => {
    if (!highlightRect) return {};

    const tooltipStyle = getTooltipStyle();
    const tooltipLeft = typeof tooltipStyle.left === "number" ? tooltipStyle.left : 0;
    const arrowLeft = highlightRect.left + highlightRect.width / 2 - tooltipLeft - 8;

    if (current.arrowPosition === "top") {
      return { top: -8, left: Math.max(20, Math.min(arrowLeft, 280)) };
    } else {
      return { bottom: -8, left: Math.max(20, Math.min(arrowLeft, 280)) };
    }
  };

  const isLastStep = step === STEPS.length - 1;

  return (
    <div ref={overlayRef} className="fixed inset-0 z-[100]">
      {/* Semi-transparent overlay - NOT pure black */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Highlight cutout */}
      {highlightRect && (
        <div
          className="absolute rounded-xl"
          style={{
            top: highlightRect.top - 8,
            left: highlightRect.left - 8,
            width: highlightRect.width + 16,
            height: highlightRect.height + 16,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.7)",
            border: "3px solid rgba(255, 255, 255, 0.3)",
          }}
        />
      )}

      {/* Tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: current.arrowPosition === "top" ? -10 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="absolute w-[320px] rounded-2xl bg-card shadow-xl px-5 py-4"
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
            {/* Progress dots */}
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

            {/* Next button */}
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
