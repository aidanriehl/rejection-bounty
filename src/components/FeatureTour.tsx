import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TourStep {
  title: string;
  description: string;
  highlightSelector?: string;
  tooltipSide: "above" | "below"; // tooltip appears above or below the highlighted element
}

const STEPS: TourStep[] = [
  {
    title: "Each week we'll assign you 8 challenges",
    description: "Complete 5 of them to beat your week.",
    highlightSelector: '[data-tour="challenge-list"]',
    tooltipSide: "above",
  },
  {
    title: "Upload challenge videos for prize entries",
    description: "Free users get 1 entry. Subscribers get 2 per challenge + 3 bonus for completing 5 (the max).",
    highlightSelector: '[data-tour="upload-btn"]',
    tooltipSide: "above",
  },
  {
    title: "Submitting videos should feel uncomfortable",
    description: "But that's the point, discomfort is where you grow.",
    highlightSelector: '[data-tour="upload-btn"]',
    tooltipSide: "above",
  },
  {
    title: "Number of players",
    description: "People who pay to play on this app are **60% more likely** to complete their challenges.",
    highlightSelector: '[data-tour="players-card"]',
    tooltipSide: "below",
  },
  {
    title: "The prize pool",
    description: "We put **100% of our profits** into the prize pool. Just a fun reason to complete your challenges.",
    highlightSelector: '[data-tour="prize-pool-card"]',
    tooltipSide: "below",
  },
  {
    title: "Time left to enter the drawing",
    description: "When the countdown ends, a random winner is drawn and a weekly recap is revealed.",
    highlightSelector: '[data-tour="countdown"]',
    tooltipSide: "below",
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function renderDescription(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-bold text-foreground">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

const GAP = 12; // gap between highlight and tooltip
const PADDING = 16; // horizontal padding from screen edges
const ARROW_SIZE = 10;

export default function FeatureTour({ onComplete }: { onComplete: () => void }) {
  const [showIntro, setShowIntro] = useState(true);
  const [step, setStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<Rect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const current = STEPS[step];

  const measure = useCallback(() => {
    if (!current.highlightSelector) {
      setHighlightRect(null);
      return;
    }
    const el = document.querySelector(current.highlightSelector);
    if (el) {
      // Scroll element into view first, then measure after settling
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        const r = el.getBoundingClientRect();
        let height = r.height;
        if (current.highlightSelector === '[data-tour="challenge-list"]') {
          const navBarHeight = 80;
          height = window.innerHeight - r.top - navBarHeight;
        }
        setHighlightRect({
          top: r.top,
          left: r.left,
          width: r.width,
          height,
        });
      }, 350);
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

  // Block interactions
  useEffect(() => {
    if (showIntro) return;
    const blockInteraction = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-tour-button]')) return;
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
    if (step < STEPS.length - 1) setStep(step + 1);
    else onComplete();
  };

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
            onClick={() => setShowIntro(false)}
            className="px-12 py-3.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-lg"
          >
            Start
          </button>
        </div>
      </motion.div>
    );
  }

  // Calculate tooltip position dynamically based on highlight rect
  const getTooltipStyle = (): React.CSSProperties => {
    if (!highlightRect) {
      // No highlight - center on screen
      return { top: "50%", left: PADDING, right: PADDING, transform: "translateY(-50%)" };
    }

    const highlightTop = highlightRect.top - 8; // account for border padding
    const highlightBottom = highlightRect.top + highlightRect.height + 8;

    if (current.tooltipSide === "below") {
      // Tooltip below the highlighted element
      return {
        top: highlightBottom + GAP + ARROW_SIZE,
        left: PADDING,
        right: PADDING,
      };
    } else {
      // Tooltip above the highlighted element - position from bottom
      // We need to calculate: the tooltip's bottom edge should be at highlightTop - GAP - ARROW_SIZE
      return {
        bottom: window.innerHeight - highlightTop + GAP + ARROW_SIZE,
        left: PADDING,
        right: PADDING,
      };
    }
  };

  // Arrow style - points toward the highlighted element
  const getArrowStyle = (): React.CSSProperties => {
    if (!highlightRect) return { display: "none" };

    // Horizontal position: center of the highlight, clamped to tooltip bounds
    const highlightCenterX = highlightRect.left + highlightRect.width / 2;
    // Clamp between PADDING+20 and screen-PADDING-20
    const clampedX = Math.max(PADDING + 24, Math.min(window.innerWidth - PADDING - 24, highlightCenterX));

    if (current.tooltipSide === "below") {
      // Arrow at top of tooltip, pointing up toward highlight
      return {
        top: -ARROW_SIZE,
        left: clampedX - PADDING, // relative to tooltip's left edge
        transform: "translateX(-50%) rotate(45deg)",
        width: ARROW_SIZE * 2,
        height: ARROW_SIZE * 2,
      };
    } else {
      // Arrow at bottom of tooltip, pointing down toward highlight
      return {
        bottom: -ARROW_SIZE,
        left: clampedX - PADDING,
        transform: "translateX(-50%) rotate(45deg)",
        width: ARROW_SIZE * 2,
        height: ARROW_SIZE * 2,
      };
    }
  };

  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
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
          x="0" y="0" width="100%" height="100%"
          fill="rgba(0, 0, 0, 0.25)"
          mask="url(#tour-mask)"
        />
      </svg>

      {/* Highlight border */}
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

      {/* Tooltip card - positioned relative to highlight */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          ref={tooltipRef}
          initial={{ opacity: 0, y: current.tooltipSide === "above" ? -16 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="absolute rounded-2xl bg-card shadow-xl px-5 py-4 pointer-events-auto"
          style={getTooltipStyle()}
        >
          {/* Arrow */}
          <div
            className="absolute bg-card rotate-45"
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
