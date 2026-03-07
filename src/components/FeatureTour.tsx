import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface TourStep {
  selector: string;
  text: string;
}

const STEPS: TourStep[] = [
  {
    selector: '[data-tour="countdown"]',
    text: "Complete challenges before the weekly deadline",
  },
  {
    selector: '[data-tour="challenge-list"]',
    text: "Finish 5 of 8 to enter the drawing",
  },
  {
    selector: '[data-tour="prize-pool"]',
    text: "Prize pool grows with more players",
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
  const measureTimeout = useRef<ReturnType<typeof setTimeout>>();

  const current = STEPS[step];

  const measure = useCallback(() => {
    const el = document.querySelector(current.selector);
    if (el) {
      // Scroll element into view if needed
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Wait a bit for scroll to complete, then measure
      setTimeout(() => {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      }, 300);
    }
  }, [current.selector]);

  useEffect(() => {
    measureTimeout.current = setTimeout(measure, 100);
    return () => clearTimeout(measureTimeout.current);
  }, [step, measure]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [measure]);

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const dismiss = () => {
    onComplete();
  };

  if (!rect) return null;

  // Position tooltip below the element
  const tooltipTop = rect.top + rect.height + 12;
  const tooltipLeft = Math.max(16, Math.min(rect.left + rect.width / 2 - 140, window.innerWidth - 296));

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ type: "spring", stiffness: 500, damping: 35 }}
        className="fixed z-[100] w-[280px] rounded-xl bg-primary px-4 py-3 shadow-lg"
        style={{ top: tooltipTop, left: tooltipLeft }}
      >
        {/* Arrow */}
        <div
          className="absolute -top-1.5 h-3 w-3 rotate-45 bg-primary"
          style={{ left: Math.min(Math.max(rect.left + rect.width / 2 - tooltipLeft - 6, 16), 248) }}
        />

        <div className="flex items-start gap-3">
          <p className="flex-1 text-sm font-medium text-primary-foreground">
            {current.text}
          </p>
          <button
            onClick={dismiss}
            className="mt-0.5 text-primary-foreground/60 hover:text-primary-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${
                  i === step ? "bg-primary-foreground" : "bg-primary-foreground/30"
                }`}
              />
            ))}
          </div>
          <button
            onClick={next}
            className="text-sm font-semibold text-primary-foreground"
          >
            {step === STEPS.length - 1 ? "Done" : "Next →"}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
