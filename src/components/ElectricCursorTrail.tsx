import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const ElectricCursorTrail: React.FC = () => {
  const [trails, setTrails] = useState<{ id: number; x: number; y: number }[]>([]);
  const [nextId, setNextId] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setTrails((prevTrails) => {
        const newTrail = { id: nextId, x: e.clientX, y: e.clientY };
        setNextId((prevId) => prevId + 1);
        return [...prevTrails.slice(-20), newTrail]; // Keep max 20 trail elements
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [nextId]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {trails.map((trail) => (
        <motion.div
          key={trail.id}
          className="absolute rounded-full bg-luxury-gold/70 blur-md"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.7, scale: 1, x: trail.x, y: trail.y }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{
            left: `${trail.x}px`,
            top: `${trail.y}px`,
            width: '10px',
            height: '10px',
            transform: 'translate(-50%, -50%)', // Center the trail element
          }}
        />
      ))}
    </div>
  );
};

export default ElectricCursorTrail;
