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
    title: "Your challenges for the week",
    description:
      "Every week we'll assign you 8 challenges. To beat your week you have to complete 5 of them.",
  },
  {
    route: "/challenges",
    selector: '[data-tour="upload-btn"]',
    title: "Upload your challenge videos to enter our prize pool",
    description:
      "Every video will get you one entry. Submitting videos should feel uncomfortable & that's the point.",
  },
  {
    route: "/challenges",
    selector: '[data-tour="subscribers-card"]',
    title: "Number of premium players",
    description:
      "People who pay to play on this app are 60% more likely to complete their challenges.",
  },
  {
    route: "/challenges",
    selector: '[data-tour="prize-pool-card"]',
    title: "The prize pool",
    description:
      "We put 100% of our profits into the prize pool. Just a fun reason to complete your challenges.",
  },
  {
    route: "/challenges",
    selector: '[data-tour="countdown"]',
    title: "Weekly Countdown",
    description:
      "Every Sunday we give new challenges, and a recap of how players performed.",
  },
  {
    route: "/profile",
    selector: '[data-tour="why-rejected"]',
    title: "Why get rejected?",
    description:
      "Read this any time to understand why we feel uncomfortable being rejected even though it doesn't matter — this might surprise you.",
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
    // Wait for page to render before measuring
    measureTimeout.current = setTimeout(measure, location.pathname === current.route ? 50 : 350);
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
    <div className="fixed inset-0 z-[100]">
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
            <p className="text-sm text-muted-foreground mb-3">{current.description}</p>

            {/* Step dots + Next */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full transition-all ${
                      i === step ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
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
