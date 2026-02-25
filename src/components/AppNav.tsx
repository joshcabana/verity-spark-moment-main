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
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[linear-gradient(180deg,rgba(10,10,10,0.84),rgba(10,10,10,0.96))] backdrop-blur-xl"
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
                  <item.icon className="h-5 w-5 text-white/45" aria-hidden="true" />
                  <span className="text-[10px] font-medium text-white/45">{item.label}</span>
                  <Lock className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-black/70 text-white/65" aria-hidden="true" />
                </span>
              </li>
            );
          }

          return (
            <li key={item.path} className="flex flex-1 justify-center">
              <Link
                to={item.path}
                aria-current={isActive ? "page" : undefined}
                className="group relative flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34d399] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 -z-10 rounded-lg bg-white/10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}

                <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.92 }} transition={{ duration: 0.2 }}>
                  <item.icon
                    className={`h-5 w-5 transition-colors ${
                      isActive ? "text-[#34d399]" : "text-white/60 group-hover:text-white/85"
                    }`}
                    aria-hidden="true"
                  />
                </motion.div>
                <span
                  className={`text-[10px] transition-colors ${
                    isActive ? "font-bold text-[#d946ef]" : "font-medium text-white/60 group-hover:text-white/85"
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
