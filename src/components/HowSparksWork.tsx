import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const sparkFlowContent = [
    {
        icon: '✨', // Animated SVG of a user entering a glowing room/portal
        title: "Enter a Live Room",
        body: "Skip the endless profiles. Connect instantly with someone genuinely present and ready to spark right now."
    },
    {
        icon: '🎞️', // Animated video icon or dynamic spark call UI snippet
        title: "The 45-Second Spark Call",
        body: "A focused, cinematic live video call designed to reveal authentic chemistry, cutting through chat fatigue."
    },
    {
        icon: '🌟', // Animated orb convergence leading to a confetti burst
        title: "Orb Convergence + Reveal",
        body: "At 15 seconds, a dramatic orb event climaxes in a mutual reveal, unlocking continuation based on real connection."
    },
];

const HowSparksWork: React.FC = () => {
    const [ref, inView] = useInView({
        triggerOnce: true,
        threshold: 0.1,
    });

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.15, duration: 0.6 } }, // Slightly faster stagger and duration
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 50 },
        visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15, duration: 0.7 } }, // Spring physics
    };

    const cardHoverVariants = {
        hover: {
            scale: 1.03,
            y: -12,
            boxShadow: "0 20px 50px rgba(229,165,25,0.4), 0 0 15px rgba(229,165,25,0.3)",
            transition: { duration: 0.3 }
        },
        tap: {
            scale: 0.98
        }
    };

    return (
        <section className="py-20 px-6 bg-background text-foreground">
            <motion.div
                ref={ref}
                initial="hidden"
                animate={inView ? "visible" : "hidden"}
                variants={containerVariants}
                className="max-w-6xl mx-auto text-center"
            >
                <motion.h2
                    className="font-montserrat text-4xl md:text-6xl text-gradient-gold drop-shadow-gold mb-16"
                    variants={itemVariants}
                >
                    How Sparks Work
                </motion.h2>

                <motion.div
                    className="grid grid-cols-1 md:grid-cols-3 gap-10"
                    variants={containerVariants}
                >
                    {sparkFlowContent.map((step, index) => (
                        <motion.article
                            key={index}
                            className="bg-luxury-gold/5 backdrop-blur-md rounded-2xl border border-luxury-gold/15 p-8 shadow-lg transition-all duration-300 transform"
                            variants={{ ...itemVariants, ...cardHoverVariants }}
                            whileHover="hover"
                            whileTap="tap"
                            custom={index} // Pass index as custom prop for potential staggered hover effects
                        >
                            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-luxury-gold to-luxury-gold-deep rounded-full flex justify-center items-center text-5xl text-white shadow-md">
                                {step.icon}
                            </div>
                            <h3 className="font-montserrat text-2xl text-luxury-gold drop-shadow-gold-soft mb-4">
                                {step.title}
                            </h3>
                            <p className="text-text-medium text-lg">
                                {step.body}
                            </p>
                        </motion.article>
                    ))}
                </motion.div>
            </motion.div>
        </section>
    );
};

export default HowSparksWork;
