import React from 'react';
import { motion } from 'framer-motion';
import SparkParticleSystem from "./SparkParticleSystem";

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
        <section className="relative w-full h-screen flex flex-col justify-center items-center text-center overflow-hidden">
            <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0">
                <source src="/public/spark_hero_background.mp4" type="video/mp4" />
                Your browser does not support the video tag.
            </video>
            <SparkParticleSystem className="opacity-70" />
