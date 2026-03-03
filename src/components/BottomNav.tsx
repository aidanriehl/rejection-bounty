import { useLocation, useNavigate } from "react-router-dom";
import { Home, Flame, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "/", icon: Home },
  { path: "/challenges", icon: Flame },
  { path: "/profile", icon: User },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-50 bg-card border-t border-border">
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
