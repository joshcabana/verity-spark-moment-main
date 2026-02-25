import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, Coins, Home, Video, User, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { path: "/", icon: Home, label: "Home", requiresAuth: false },
  { path: "/lobby", icon: Video, label: "Go Live", requiresAuth: false },
  { path: "/sparks", icon: Flame, label: "Sparks", requiresAuth: true },
  { path: "/tokens", icon: Coins, label: "Tokens", requiresAuth: true },
  { path: "/profile", icon: User, label: "Profile", requiresAuth: true },
];

const AppNav = () => {
  const location = useLocation();
  const { user } = useAuth();

  // Hide nav on call and match screens
  if (["/call", "/match"].includes(location.pathname)) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-border/30">
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const isLocked = item.requiresAuth && !user;

          if (isLocked) {
            return (
              <span
                key={item.path}
                className="relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg opacity-35 cursor-not-allowed"
              >
                <item.icon className="w-5 h-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">
                  {item.label}
                </span>
                <Lock className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 text-muted-foreground" />
              </span>
            );
          }

          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 bg-primary/10 rounded-lg"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                />
              )}
              <item.icon
                className={`w-5 h-5 relative z-10 transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <span
                className={`text-[10px] relative z-10 transition-colors ${
                  isActive ? "text-primary font-medium" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default AppNav;
