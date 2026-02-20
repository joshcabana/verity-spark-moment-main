import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, Coins, Home, Video, User } from "lucide-react";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/lobby", icon: Video, label: "Go Live" },
  { path: "/sparks", icon: Flame, label: "Sparks" },
  { path: "/tokens", icon: Coins, label: "Tokens" },
  { path: "/profile", icon: User, label: "Profile" },
];

const AppNav = () => {
  const location = useLocation();

  // Hide nav on call and match screens
  if (["/call", "/match"].includes(location.pathname)) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-border/30">
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
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
