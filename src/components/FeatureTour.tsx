import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface TourStep {
  route: string;
  selector: string;
  title: string;
  description: string;
}

const STEPS: TourStep[] = [
  {
    route: "/challenges",
    selector: '[data-tour="challenge-list"]',
    title: "Each week we'll assign you 8 challenges",
    description:
      "Complete 5 of them to beat your week.",
  },
  {
    route: "/challenges",
    selector: '[data-tour="upload-btn"]',
    title: "Upload challenge videos for prize entries",
    description:
      "Free users get 1 entry. Subscribers get 2 per challenge + 3 bonus for completing 5 (the max).",
  },
  {
    route: "/challenges",
    selector: '[data-tour="upload-btn"]',
    title: "Submitting videos should feel uncomfortable",
    description:
      "But that's the point, discomfort is where you grow.",
  },
  {
    route: "/challenges",
    selector: '[data-tour="subscribers-card"]',
    title: "Number of players",
    description:
      "People who pay to play on this app are **60% more likely** to complete their challenges.",
  },
  {
    route: "/challenges",
    selector: '[data-tour="prize-pool-card"]',
    title: "The prize pool",
    description:
      "We put **100% of our profits** into the prize pool. Just a fun reason to complete your challenges.",
  },
  {
    route: "/challenges",
    selector: '[data-tour="countdown"]',
    title: "Time left to enter the drawing",
    description:
      "When the countdown ends, a random winner is drawn and a weekly recap is revealed.",
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function FeatureTour({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const measureTimeout = useRef<ReturnType<typeof setTimeout>>();

  const current = STEPS[step];

  const measure = useCallback(() => {
    const el = document.querySelector(current.selector);
    if (el) {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    } else {
      setRect(null);
    }
  }, [current.selector]);

  // Navigate to the correct route if needed, then measure
  useEffect(() => {
    if (location.pathname !== current.route) {
      navigate(current.route);
    }
    // Wait for page to render before measuring; retry a few times if element not found
    let attempts = 0;
    const tryMeasure = () => {
      const el = document.querySelector(current.selector);
      if (el) {
        measure();
      } else if (attempts < 10) {
        attempts++;
        measureTimeout.current = setTimeout(tryMeasure, 300);
      } else {
        // Element never appeared — skip this step or complete tour
        if (step < STEPS.length - 1) {
          setStep(step + 1);
        } else {
          onComplete();
        }
      }
    };
    measureTimeout.current = setTimeout(tryMeasure, location.pathname === current.route ? 50 : 350);
    return () => clearTimeout(measureTimeout.current);
  }, [step, location.pathname, current.route, navigate, measure]);

  // Re-measure on resize
  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const next = () => {
    if (step < STEPS.length - 1) {
      setRect(null);
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  

  // Tooltip position: below if spotlight is in top half, above otherwise
  const tooltipBelow = rect ? rect.top + rect.height / 2 < window.innerHeight / 2 : true;

  return (
    <div className="fixed inset-0 z-[100]" style={{ pointerEvents: rect ? "auto" : "none" }}>
      {/* Dark overlay with spotlight hole */}
      {rect && (
        <div
          className="absolute rounded-xl transition-all duration-300 ease-out"
          style={{
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)",
            zIndex: 1,
          }}
        />
      )}

      {/* Clickable backdrop to prevent interaction */}
      <div className="absolute inset-0" style={{ zIndex: 0 }} />

      {/* Tooltip card */}
      <AnimatePresence mode="popLayout">
        {rect && (
          <motion.div
            key={step}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute left-4 right-4 mx-auto max-w-sm rounded-2xl bg-card px-5 pt-5 pb-3.5 shadow-xl border"
            style={{
              zIndex: 2,
              ...(tooltipBelow
                ? { top: Math.min(rect.top + rect.height + 20, window.innerHeight - 220) }
                : { top: Math.max(20, rect.top - 200) }),
            }}
          >
            {/* Arrow pointer — points toward the spotlight center */}
            {(() => {
              // tooltip is left:16px right:16px (1rem each side), so its width ≈ viewport - 32
              const tooltipLeft = 16;
              const tooltipWidth = Math.min(window.innerWidth - 32, 384); // max-w-sm = 384
              const spotlightCenterX = rect.left + rect.width / 2;
              const arrowLeft = Math.max(24, Math.min(spotlightCenterX - tooltipLeft, tooltipWidth - 24));
              return (
                <div
                  className="absolute h-3 w-3 rotate-45 bg-card border"
                  style={{
                    left: arrowLeft,
                    ...(tooltipBelow
                      ? { top: -6, borderRight: "none", borderBottom: "none" }
                      : { bottom: -6, borderLeft: "none", borderTop: "none" }),
                  }}
                />
              );
            })()}

            <h2 className="text-lg font-bold text-foreground mb-1">{current.title}</h2>
            <p className="text-sm text-muted-foreground mb-3"
              dangerouslySetInnerHTML={{
                __html: current.description.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-foreground">$1</strong>')
              }}
            />

            {/* Step dots + Next */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 w-2 rounded-full transition-all ${
                      i === step
                        ? "bg-primary shadow-[0_0_4px_hsl(var(--primary)/0.5)]"
                        : i < step
                          ? "bg-gradient-to-br from-[hsl(50_100%_70%)] via-[hsl(43_96%_56%)] to-[hsl(35_90%_40%)] shadow-[0_0_3px_hsl(45_90%_50%/0.4)]"
                          : "bg-muted-foreground/30"
                    }`}
                    style={i < step ? { boxShadow: "inset 0 -1px 1px rgba(0,0,0,0.15), inset 0 1px 1px rgba(255,255,255,0.4), 0 0 3px hsla(45,90%,50%,0.4)" } : undefined}
                  />
                ))}
              </div>

              <Button size="sm" onClick={next} className="rounded-full px-5">
                {step === STEPS.length - 1 ? "Got it! 🎉" : "Next"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
