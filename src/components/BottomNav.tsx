import { useLocation, useNavigate } from "react-router-dom";
import { Home, User, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const ADMIN_EMAIL = "aidanriehl5@gmail.com";

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
      {/* Center bar */}
      <line x1="6.4" y1="12" x2="17.6" y2="12" />
      {/* Left weight */}
      <rect x="1.6" y="7.2" width="4.8" height="9.6" rx="1" fill="currentColor" />
      {/* Right weight */}
      <rect x="17.6" y="7.2" width="4.8" height="9.6" rx="1" fill="currentColor" />
    </svg>
  );
}

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isAdmin = user?.email === ADMIN_EMAIL;

  const tabs = [
    { path: "/", icon: Home },
    { path: "/challenges", icon: SimpleDumbbell },
    { path: "/profile", icon: User },
    ...(isAdmin ? [{ path: "/admin", icon: Settings }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full z-50 bg-card border-t border-border" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="mx-auto flex max-w-lg items-center justify-around h-14">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex h-12 w-12 items-center justify-center transition-colors",
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
