import { useLocation, useNavigate } from "react-router-dom";
import { Home, User } from "lucide-react";
import { cn } from "@/lib/utils";

// Simple dumbbell with one weight on each side
function SimpleDumbbell({ className, strokeWidth = 2 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Bar */}
      <line x1="6" y1="12" x2="18" y2="12" />
      {/* Left weight */}
      <rect x="2" y="8" width="4" height="8" rx="1" />
      {/* Right weight */}
      <rect x="18" y="8" width="4" height="8" rx="1" />
    </svg>
  );
}

const tabs = [
  { path: "/", icon: Home },
  { path: "/challenges", icon: SimpleDumbbell },
  { path: "/profile", icon: User },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full z-50 bg-card border-t border-border">
      <div className="mx-auto flex max-w-lg items-center justify-around py-3">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex items-center justify-center rounded-full p-3 transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-6 w-6" strokeWidth={active ? 2.5 : 1.5} />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
