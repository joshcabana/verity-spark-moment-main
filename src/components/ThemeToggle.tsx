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
      className={`inline-flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm font-medium text-foreground backdrop-blur-md transition-colors hover:bg-accent hover:text-accent-foreground ${className}`}
    >
      {mounted && isDark ? <Sun className="h-4 w-4 text-verity-gold" /> : <Moon className="h-4 w-4 text-verity-gold" />}
      <span className="hidden sm:inline">{mounted ? (isDark ? "Light" : "Dark") : "Theme"}</span>
    </button>
  );
};

export default ThemeToggle;
