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
    <nav aria-label="Main Navigation" className="fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-border/30 shadow-[0_-4px_16px_rgba(0,0,0,0.1)]">
      <ul className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto m-0 list-none">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const isLocked = item.requiresAuth && !user;

          if (isLocked) {
            return (
              <li key={item.path} className="flex-1 flex justify-center">
                <span
                  role="link"
                  aria-disabled="true"
                  title={`${item.label} (Login required)`}
                  className="relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg opacity-40 cursor-not-allowed"
                >
                  <item.icon className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {item.label}
                  </span>
                  <Lock className="absolute -top-1 -right-1 w-3 h-3 text-muted-foreground bg-background/80 rounded-full" aria-hidden="true" />
                </span>
              </li>
            );
          }

          return (
            <li key={item.path} className="flex-1 flex justify-center">
              <Link
                to={item.path}
                aria-current={isActive ? "page" : undefined}
                className="relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background group"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 bg-primary/10 rounded-lg -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <motion.div
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col items-center gap-1"
                >
                  <item.icon
                    className={`w-5 h-5 transition-colors ${
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground/80"
                    }`}
                    aria-hidden="true"
                  />
                  <span
                    className={`text-[10px] transition-colors ${
                      isActive ? "text-primary font-bold" : "text-muted-foreground font-medium group-hover:text-foreground/80"
                    }`}
                  >
                    {item.label}
                  </span>
                </motion.div>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default AppNav;
