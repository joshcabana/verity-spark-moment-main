import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const sparkFlowContent = [
    {
        icon: '✨', // Placeholder for custom SVG/Video
        title: "Enter a Live Room",
        body: "Skip the endless profiles. Connect instantly with someone genuinely present and ready to spark right now."
    },
    {
        icon: '🎥', // Placeholder for custom SVG/Video
        title: "The 45-Second Spark Call",
        body: "A focused, cinematic live video call designed to reveal authentic chemistry, cutting through chat fatigue."
    },
    {
        icon: '🔮', // Placeholder for custom SVG/Video
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
        visible: { opacity: 1, transition: { staggerChildren: 0.2, duration: 0.5 } },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 50 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
    };

    return (
        <section className="py-20 px-6 bg-dark-charcoal text-text-light">
            <motion.div
                ref={ref}
                initial="hidden"
                animate={inView ? "visible" : "hidden"}
                variants={containerVariants}
                className="max-w-6xl mx-auto text-center"
            >
                <motion.h2
                    className="font-montserrat text-5xl text-neon-green drop-shadow-neon mb-16"
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
                            className="bg-electric-violet/10 backdrop-blur-md rounded-2xl border border-electric-violet/20 p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
                            variants={itemVariants}
                        >
                            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-electric-violet to-fiery-orange rounded-full flex justify-center items-center text-5xl text-white shadow-md">
                                {step.icon}
                            </div>
                            <h3 className="font-montserrat text-2xl text-fiery-orange drop-shadow-electric mb-4">
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
