import React, { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TrailDot {
  id: number;
  x: number;
  y: number;
}

const MAX_TRAILS = 15;

const ElectricCursorTrail: React.FC = () => {
  const [trails, setTrails] = React.useState<TrailDot[]>([]);
  const idRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const latestPos = useRef<{ x: number; y: number } | null>(null);

  const flushTrail = useCallback(() => {
    rafRef.current = null;
    const pos = latestPos.current;
    if (!pos) return;
    latestPos.current = null;

    const newId = ++idRef.current;
    setTrails((prev) => [...prev.slice(-(MAX_TRAILS - 1)), { id: newId, x: pos.x, y: pos.y }]);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      latestPos.current = { x: e.clientX, y: e.clientY };
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(flushTrail);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [flushTrail]);

  // Auto-expire old trails
  useEffect(() => {
    if (trails.length === 0) return;
    const timer = setTimeout(() => {
      setTrails((prev) => prev.slice(1));
    }, 600);
    return () => clearTimeout(timer);
  }, [trails.length]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {trails.map((trail) => (
          <motion.div
            key={trail.id}
            className="absolute rounded-full bg-luxury-gold/60 blur-md"
            initial={{ opacity: 0.7, scale: 1 }}
            animate={{ opacity: 0, scale: 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              left: trail.x,
              top: trail.y,
              width: 8,
              height: 8,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ElectricCursorTrail;
