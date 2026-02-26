import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';

const ThemeModeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const isLight = theme === 'light';

  return (
    <motion.button
      onClick={() => setTheme(isLight ? 'dark' : 'light')}
      className="fixed top-4 right-4 z-[60] p-2.5 rounded-full border border-border bg-card/60 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300"
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
          <Moon className="h-5 w-5 text-primary" />
        ) : (
          <Sun className="h-5 w-5 text-primary" />
        )}
      </motion.div>
    </motion.button>
  );
};

export default ThemeModeToggle;
