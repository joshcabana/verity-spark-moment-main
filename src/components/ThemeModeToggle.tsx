import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';

const ThemeModeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);

    // Initialize theme from prefers-color-scheme if no localStorage value exists
    if (!localStorage.getItem('theme')) {
      const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
      setTheme(prefersLight ? 'light' : 'dark');
    }
  }, []);

  // Update meta theme-color dynamically
  useEffect(() => {
    if (mounted) {
      const metaThemeColor = document.querySelector("meta[name=\"theme-color\"]");
      if (metaThemeColor) {
        metaThemeColor.setAttribute("content", theme === 'light' ? '#F9F6F1' : '#080808');
      }
    }
  }, [theme, mounted]);

  if (!mounted) {
    return null;
  }

  const isLight = theme === 'light';

  return (
    <motion.button
      onClick={() => setTheme(isLight ? 'dark' : 'light')}
      className="fixed top-4 right-4 z-[60] p-2.5 rounded-full border border-white/10 bg-black/40 backdrop-blur-xl shadow-lg hover:shadow-gold transition-all duration-300"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      aria-label={isLight ? 'Switch to night mode' : 'Switch to day mode'}
    >
      <motion.div
        initial={false}
        animate={{ rotate: isLight ? 180 : 0 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
      >
        {isLight ? (
          <Moon className="h-5 w-5 text-luxury-gold" />
        ) : (
          <Sun className="h-5 w-5 text-luxury-gold" />
        )}
      </motion.div>
    </motion.button>
  );
};

export default ThemeModeToggle;
