import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Coins, Flame, Home, Lock, User, Video } from "lucide-react";
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

  if (["/call", "/match"].includes(location.pathname)) return null;

  return (
    <nav
      aria-label="Main Navigation"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-verity-gold/25 bg-[linear-gradient(180deg,hsl(var(--card)/0.84),hsl(var(--background)/0.96))] backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-lg list-none items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const isLocked = item.requiresAuth && !user;

          if (isLocked) {
            return (
              <li key={item.path} className="flex flex-1 justify-center">
                <span
                  role="link"
                  aria-disabled="true"
                  title={`${item.label} (Login required)`}
                  className="relative flex cursor-not-allowed flex-col items-center gap-1 rounded-lg px-3 py-1.5 opacity-45"
                >
                  <item.icon className="h-5 w-5 text-foreground/45" aria-hidden="true" />
                  <span className="text-[10px] font-medium text-foreground/45">{item.label}</span>
                  <Lock className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-background/80 text-foreground/65" aria-hidden="true" />
                </span>
              </li>
            );
          }

          return (
            <li key={item.path} className="flex flex-1 justify-center">
              <Link
                to={item.path}
                aria-current={isActive ? "page" : undefined}
                className="group relative flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 -z-10 rounded-lg bg-primary/15"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}

                <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.92 }} transition={{ duration: 0.2 }}>
                  <item.icon
                    className={`h-5 w-5 transition-colors ${
                      isActive ? "text-primary" : "text-foreground/60 group-hover:text-foreground/85"
                    }`}
                    aria-hidden="true"
                  />
                </motion.div>
                <span
                  className={`text-[10px] transition-colors ${
                    isActive ? "font-bold text-verity-gold" : "font-medium text-foreground/60 group-hover:text-foreground/85"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default AppNav;
