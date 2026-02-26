import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

type ThemeToggleProps = {
  className?: string;
};

const ThemeToggle = ({ className = "" }: ThemeToggleProps) => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = (theme === "system" ? resolvedTheme : theme) === "dark";

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`inline-flex items-center gap-2 rounded-full border border-verity-gold/35 bg-card/85 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-foreground shadow-[0_10px_28px_rgba(0,0,0,0.25)] backdrop-blur-xl transition-colors hover:border-verity-gold/55 hover:bg-card ${className}`}
    >
      {mounted && isDark ? <Sun className="h-4 w-4 text-verity-gold" /> : <Moon className="h-4 w-4 text-verity-gold" />}
      <span className="hidden sm:inline">{mounted ? (isDark ? "Day" : "Night") : "Theme"}</span>
    </button>
  );
};

export default ThemeToggle;
