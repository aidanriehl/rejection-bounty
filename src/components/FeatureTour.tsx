import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TourStep {
  title: string;
  description: string;
  highlightSelector?: string;
  tooltipSide: "above" | "below";
  /** For challenge-list: cap highlight height to visible area */
  capToViewport?: boolean;
}

const STEPS: TourStep[] = [
  {
    title: "Each week we'll assign you 8 challenges",
    description: "Complete 5 of them to beat your week.",
    highlightSelector: '[data-tour="challenge-list"]',
    tooltipSide: "above",
    capToViewport: true,
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

const GAP = 12;
const EDGE_PAD = 16;
const ARROW_SIZE = 10;
const HIGHLIGHT_PAD = 8;
const NAV_HEIGHT = 72;

export default function FeatureTour({ onComplete }: { onComplete: () => void }) {
  const [showIntro, setShowIntro] = useState(true);
  const [step, setStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<Rect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const current = STEPS[step];

  // Lock scroll on #root and scroll to top
  useEffect(() => {
    const root = document.getElementById("root");
    if (!root) return;

    if (!showIntro) {
      root.scrollTo({ top: 0, behavior: "instant" });
      root.style.overflow = "hidden";
      root.style.touchAction = "none";
    }

    return () => {
      root.style.overflow = "";
      root.style.touchAction = "";
    };
  }, [showIntro]);

  // Block all interactions except tour buttons
  useEffect(() => {
    if (showIntro) return;

    const block = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-tour-button]")) return;
      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener("touchstart", block, { capture: true, passive: false });
    document.addEventListener("touchmove", block, { capture: true, passive: false });
    document.addEventListener("click", block, { capture: true });
    document.addEventListener("pointerdown", block, { capture: true });

    return () => {
      document.removeEventListener("touchstart", block, { capture: true });
      document.removeEventListener("touchmove", block, { capture: true });
      document.removeEventListener("click", block, { capture: true });
      document.removeEventListener("pointerdown", block, { capture: true });
    };
  }, [showIntro]);

  const measure = useCallback(() => {
    if (!current.highlightSelector) {
      setHighlightRect(null);
      return;
    }

    const el = document.querySelector(current.highlightSelector);
    if (!el) return;

    // Scroll into view, wait, then measure
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });

    setTimeout(() => {
      const r = el.getBoundingClientRect();
      let height = r.height;

      // Cap challenge list to visible viewport (don't extend below nav)
      if (current.capToViewport) {
        const maxBottom = window.innerHeight - NAV_HEIGHT;
        height = Math.min(height, maxBottom - r.top);
      }

      setHighlightRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height,
      });
    }, 400);
  }, [current.highlightSelector, current.capToViewport]);

  useEffect(() => {
    if (showIntro) return;
    const t = setTimeout(measure, 100);
    return () => clearTimeout(t);
  }, [step, showIntro, measure]);

  useEffect(() => {
    if (showIntro) return;
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure, showIntro]);

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else onComplete();
  };

  // --- Intro screen ---
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

  // --- Tooltip positioning ---
  const getTooltipStyle = (): React.CSSProperties => {
    if (!highlightRect) {
      return { top: "50%", left: EDGE_PAD, right: EDGE_PAD, transform: "translateY(-50%)" };
    }

    const hTop = highlightRect.top - HIGHLIGHT_PAD;
    const hBottom = highlightRect.top + highlightRect.height + HIGHLIGHT_PAD;

    if (current.tooltipSide === "below") {
      return {
        top: hBottom + GAP + ARROW_SIZE,
        left: EDGE_PAD,
        right: EDGE_PAD,
      };
    }
    // above
    return {
      bottom: window.innerHeight - hTop + GAP + ARROW_SIZE,
      left: EDGE_PAD,
      right: EDGE_PAD,
    };
  };

  // --- Arrow positioning ---
  const getArrowStyle = (): React.CSSProperties => {
    if (!highlightRect) return { display: "none" };

    const centerX = highlightRect.left + highlightRect.width / 2;
    const clamped = Math.max(EDGE_PAD + 24, Math.min(window.innerWidth - EDGE_PAD - 24, centerX));

    const base: React.CSSProperties = {
      position: "absolute",
      left: clamped - EDGE_PAD,
      transform: "translateX(-50%) rotate(45deg)",
      width: ARROW_SIZE * 2,
      height: ARROW_SIZE * 2,
    };

    if (current.tooltipSide === "below") {
      return { ...base, top: -ARROW_SIZE };
    }
    return { ...base, bottom: -ARROW_SIZE };
  };

  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100]" style={{ pointerEvents: "none" }}>
      {/* Dimming overlay with cutout */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "auto" }}>
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {highlightRect && (
              <rect
                x={highlightRect.left - HIGHLIGHT_PAD}
                y={highlightRect.top - HIGHLIGHT_PAD}
                width={highlightRect.width + HIGHLIGHT_PAD * 2}
                height={highlightRect.height + HIGHLIGHT_PAD * 2}
                rx="14"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          fill="rgba(0, 0, 0, 0.3)"
          mask="url(#tour-mask)"
        />
      </svg>

      {/* Highlight border */}
      {highlightRect && (
        <div
          className="absolute rounded-xl"
          style={{
            pointerEvents: "none",
            top: highlightRect.top - HIGHLIGHT_PAD,
            left: highlightRect.left - HIGHLIGHT_PAD,
            width: highlightRect.width + HIGHLIGHT_PAD * 2,
            height: highlightRect.height + HIGHLIGHT_PAD * 2,
            border: "2px solid hsl(var(--primary))",
          }}
        />
      )}

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          ref={tooltipRef}
          initial={{ opacity: 0, y: current.tooltipSide === "above" ? -12 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="absolute rounded-2xl bg-card shadow-xl px-5 py-4"
          style={{ ...getTooltipStyle(), pointerEvents: "auto" }}
        >
          {/* Arrow nub */}
          <div
            className="absolute bg-card"
            style={getArrowStyle()}
          />

          {/* Content */}
          <h2 className="text-lg font-bold text-foreground mb-1.5 relative z-10">
            {current.title}
          </h2>
          <p className="text-sm text-muted-foreground mb-4 relative z-10">
            {renderDescription(current.description)}
          </p>

          {/* Footer: dots + button */}
          <div className="flex items-center justify-between relative z-10">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => {
                let dotStyle: React.CSSProperties = {};

                if (i < step) {
                  // Completed - metallic gold
                  dotStyle = {
                    background: "linear-gradient(135deg, #D4A017 0%, #F5D060 40%, #B8860B 70%, #F5D060 100%)",
                    boxShadow: "0 1px 3px rgba(212, 160, 23, 0.4)",
                  };
                } else if (i === step) {
                  // Current - metallic green
                  dotStyle = {
                    background: "linear-gradient(135deg, #1A8A6A 0%, #3DCCA8 40%, #0D6B4F 70%, #3DCCA8 100%)",
                    boxShadow: "0 1px 3px rgba(26, 138, 106, 0.5)",
                  };
                } else {
                  // Future - muted
                  dotStyle = {
                    background: "hsl(var(--muted-foreground) / 0.25)",
                  };
                }

                return (
                  <div
                    key={i}
                    className="h-2.5 w-2.5 rounded-full"
                    style={dotStyle}
                  />
                );
              })}
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
