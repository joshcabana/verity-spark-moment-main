import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const AbstractParallaxBackground: React.FC = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref });

  const y1 = useTransform(scrollYProgress, [0, 1], ["0%", "-50%"]);
  const y2 = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const y3 = useTransform(scrollYProgress, [0, 1], ["0%", "-70%"]);

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      {/* Top Left Glow */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-electric-violet opacity-10 blur-3xl"
        style={{ y: y1 }}
      />
      {/* Bottom Right Glow */}
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-fiery-orange opacity-10 blur-3xl"
        style={{ y: y2 }}
      />
      {/* Mid Left Glow */}
      <motion.div
        className="absolute top-1/2 left-1/3 w-72 h-72 rounded-full bg-neon-green opacity-10 blur-3xl"
        style={{ y: y3 }}
      />
    </div>
  );
};

export default AbstractParallaxBackground;
