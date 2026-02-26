import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import SparkParticleSystem from "./SparkParticleSystem";

const HeroSection: React.FC = () => {
    const fadeInSlideUpVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 80, damping: 15 } },
    };

    const fadeInVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { type: "spring" as const, stiffness: 80, damping: 15 } },
    };

    const buttonVariants = {
        hover: {
            scale: 1.05,
            boxShadow: "0 15px 40px rgba(229,165,25,0.7)",
            transition: { duration: 0.3 }
        },
        tap: {
            scale: 0.98
        }
    };

    return (
        <section className="relative w-full h-screen flex flex-col justify-center items-center text-center overflow-hidden">
            <video autoPlay loop muted playsInline preload="auto" className="absolute inset-0 w-full h-full object-cover z-0">
                <source src="/hero-loop.webm" type="video/webm" />
                <source src="/hero-loop.mp4" type="video/mp4" />
                Your browser does not support the video tag.
            </video>
            <SparkParticleSystem className="opacity-70" />

            <motion.div
                className="relative z-10 p-5 max-w-4xl"
                initial="hidden"
                animate="visible"
                variants={fadeInSlideUpVariants}
                transition={{ delay: 0.5 }}
            >
                <motion.img
                    src="/verity_logo.webp"
                    alt="VERITY Logo"
                    className="max-w-xs mx-auto mb-5"
                    initial="hidden"
                    animate="visible"
                    variants={fadeInVariants}
                    transition={{ delay: 0.2 }}
                />
                <motion.h1
                    className="font-display text-7xl md:text-8xl lg:text-9xl text-gradient-gold leading-tight mb-3 drop-shadow-lux"
                    initial="hidden"
                    animate="visible"
                    variants={fadeInSlideUpVariants}
                    transition={{ delay: 0.7 }}
                >
                    VERITY
                </motion.h1>
                <motion.p
                    className="font-display text-2xl md:text-3xl text-primary mb-10 drop-shadow-lux-sm"
                    initial="hidden"
                    animate="visible"
                    variants={fadeInSlideUpVariants}
                    transition={{ delay: 0.9 }}
                >
                    Real Eyes. Real Spark.
                </motion.p>
                <motion.div
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: 1.1, ...fadeInSlideUpVariants.visible.transition }}
                >
                    <Link
                        to="/auth?mode=signup"
                        className="inline-block bg-gradient-to-r from-luxury-gold to-luxury-gold-deep text-primary-foreground text-xl font-bold py-4 px-8 rounded-full shadow-lg"
                    >
                        Start your first Spark
                    </Link>
                </motion.div>
            </motion.div>
        </section>
    );
};

export default HeroSection;
