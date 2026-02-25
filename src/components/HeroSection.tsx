import React from 'react';
import { motion } from 'framer-motion';

const HeroSection: React.FC = () => {
    const fadeInSlideUpVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 1.2, ease: "easeOut" } },
    };

    const fadeInVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 1, ease: "easeOut" } },
    };

    const buttonVariants = {
        hover: {
            scale: 1.05,
            boxShadow: "0 15px 40px rgba(255, 69, 0, 0.9)",
            transition: { duration: 0.3 }
        },
        tap: {
            scale: 0.98
        }
    };

    return (
        <section className="relative w-full h-screen flex flex-col justify-center items-center text-center overflow-hidden bg-cover bg-center"
            style={{
                backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('/Spark_Video_Placeholder.mp4')`, // Placeholder video
            }}
        >
            {/* Background Video Placeholder - actual video element will replace this in final implementation */}
            {/* <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0">
                <source src="/path/to/optimized-spark-video.mp4" type="video/mp4" />
                Your browser does not support the video tag.
            </video> */}

            <motion.div
                className="relative z-10 p-5 max-w-4xl"
                initial="hidden"
                animate="visible"
                variants={fadeInSlideUpVariants}
                transition={{ delay: 0.5 }}
            >
                <motion.img
                    src="/public/verity_logo.png" // Updated path to public folder
                    alt="VERITY Logo"
                    className="max-w-xs mx-auto mb-5"
                    initial="hidden"
                    animate="visible"
                    variants={fadeInVariants}
                    transition={{ delay: 0.2 }}
                />
                <motion.h1
                    className="font-montserrat text-6xl md:text-7xl lg:text-8xl text-neon-green leading-tight mb-3 drop-shadow-neon"
                    initial="hidden"
                    animate="visible"
                    variants={fadeInSlideUpVariants}
                    transition={{ delay: 0.7 }}
                >
                    VERITY
                </motion.h1>
                <motion.p
                    className="font-montserrat text-2xl md:text-3xl text-electric-violet mb-10 drop-shadow-electric"
                    initial="hidden"
                    animate="visible"
                    variants={fadeInSlideUpVariants}
                    transition={{ delay: 0.9 }}
                >
                    Real Eyes. Real Spark.
                </motion.p>
                <motion.a
                    href="#"
                    className="inline-block bg-gradient-to-r from-electric-violet to-fiery-orange text-white text-xl font-bold py-4 px-8 rounded-full shadow-lg"
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: 1.1, ...fadeInSlideUpVariants.visible.transition }}
                >
                    Start your first Spark
                </motion.a>
            </motion.div>

            {/* Particle System Placeholder */}
            {/* This will be a more complex component, potentially using react-tsparticles or a custom WebGL solution */}
            <div className="absolute inset-0 z-0 opacity-50 pointer-events-none" style={{
                background: `radial-gradient(circle at 70% 30%, rgba(138,43,226,0.15) 0%, rgba(138,43,226,0) 60%),
                             radial-gradient(circle at 30% 70%, rgba(57,255,20,0.1) 0%, rgba(57,255,20,0) 70%),
                             radial-gradient(circle at 50% 50%, rgba(255,69,0,0.08) 0%, rgba(255,69,0,0) 50%)`
            }}></div>
        </section>
    );
};

export default HeroSection;

// Tailwind CSS Classes (to be added to tailwind.config.ts or global.css)
// These custom classes define the color palette and shadows based on 'Electric Bloom'
/*
module.exports = {
  theme: {
    extend: {
      colors: {
        'dark-charcoal': '#1C1C1C',
        'electric-violet': '#8A2BE2',
        'neon-green': '#39FF14',
        'fiery-orange': '#FF4500',
        'text-light': '#E0E0E0',
        'text-medium': '#C5C5C5',
        'text-dark': '#A0A0A0',
      },
      fontFamily: {
        montserrat: ['Montserrat', 'sans-serif'],
        nunito: ['Nunito', 'sans-serif'],
      },
      dropShadow: {
        neon: '0 0 25px rgba(57,255,20,0.9)',
        electric: '0 0 15px rgba(138,43,226,0.7)',
      }
    },
  },
}
*/
