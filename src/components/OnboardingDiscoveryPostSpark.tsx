import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const flowStepsContent = [
    {
        icon: '✨',
        title: "Welcome to Real Connections",
        body: "Dive into Verity's unique anti-swipe experience. We'll guide you through setting up your profile, understanding Spark etiquette, and getting ready for your first genuine connection.",
        cta: "Get Started"
    },
    {
        icon: '🔎',
        title: "Spark Discovery",
        body: "No endless scrolling. Verity intelligently matches you with individuals who are genuinely present and seeking a real-time Spark. Prepare for a spontaneous, authentic encounter.",
        cta: "Find Your Spark",
        subText: "Searching for compatible Sparks..."
    },
    {
        icon: '💖',
        title: "What Happens After a Spark?",
        body: "If there's a mutual reveal, the connection ignites! You'll have options to connect further, send a message, or simply reflect on the experience. No pressure, just genuine next steps.",
        actions: [
            { label: "Send a Message", href: "#" },
            { label: "View Profile", href: "#" },
            { label: "Spark Again!", href: "#" }
        ]
    },
];

const OnboardingDiscoveryPostSpark: React.FC = () => {
    const [ref, inView] = useInView({
        triggerOnce: true,
        threshold: 0.1,
    });

    const sectionVariants = {
        hidden: { opacity: 0, y: 50 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
    };

    const stepVariants = {
        hidden: { opacity: 0, scale: 0.9 },
        visible: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: "easeOut" } },
    };

    return (
        <section className="py-20 px-6 bg-dark-charcoal text-text-light">
            <motion.div
                ref={ref}
                initial="hidden"
                animate={inView ? "visible" : "hidden"}
                variants={sectionVariants}
                className="max-w-4xl mx-auto rounded-2xl p-10 shadow-2xl bg-gradient-to-br from-dark-charcoal to-dark-charcoal/50 border border-electric-violet/20"
            >
                <motion.h2
                    className="font-montserrat text-5xl text-neon-green drop-shadow-neon mb-16 text-center"
                    variants={sectionVariants}
                >
                    Your Journey with VERITY
                </motion.h2>

                <div className="flex flex-col gap-16">
                    {flowStepsContent.map((step, index) => (
                        <React.Fragment key={index}>
                            <motion.div
                                className="bg-electric-violet/10 backdrop-blur-md rounded-xl border border-electric-violet/20 p-8 shadow-lg flex flex-col items-center text-center"
                                variants={stepVariants}
                                initial="hidden"
                                animate={inView ? "visible" : "hidden"}
                                transition={{ delay: 0.3 + index * 0.2 }}
                            >
                                <div className="w-28 h-28 mx-auto mb-6 bg-gradient-to-br from-electric-violet to-fiery-orange rounded-full flex justify-center items-center text-6xl text-white shadow-xl">
                                    {step.icon}
                                </div>
                                <h3 className="font-montserrat text-3xl text-fiery-orange drop-shadow-electric mb-4">
                                    {step.title}
                                </h3>
                                <p className="text-text-medium text-lg max-w-2xl">
                                    {step.body}
                                </p>
                                {step.cta && (
                                    <motion.a
                                        href="#"
                                        className="mt-6 inline-block bg-gradient-to-r from-electric-violet to-fiery-orange text-white text-lg font-bold py-3 px-8 rounded-full shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl"
                                        whileHover={{ scale: 1.05, boxShadow: "0 10px 30px rgba(255, 69, 0, 0.6)" }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        {step.cta}
                                    </motion.a>
                                )}
                                {step.subText && (
                                    <motion.p
                                        className="mt-5 text-neon-green font-semibold text-lg animate-pulse"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 1 + index * 0.2, duration: 1, repeat: Infinity, repeatType: "reverse" }}
                                    >
                                        {step.subText}
                                    </motion.p>
                                )}
                                {step.actions && (
                                    <div className="mt-6 flex flex-wrap justify-center gap-4">
                                        {step.actions.map((action, actionIndex) => (
                                            <motion.a
                                                key={actionIndex}
                                                href={action.href}
                                                className="inline-block bg-gradient-to-r from-electric-violet to-fiery-orange text-white text-md font-bold py-3 px-6 rounded-full shadow-md transition-all duration-300 hover:scale-105 hover:shadow-lg"
                                                whileHover={{ scale: 1.05, boxShadow: "0 8px 25px rgba(255, 69, 0, 0.5)" }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                {action.label}
                                            </motion.a>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                            {index < flowStepsContent.length - 1 && (
                                <motion.div
                                    className="text-electric-violet text-7xl text-center opacity-60"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={inView ? { opacity: 0.6, y: 0 } : { opacity: 0, y: 20 }}
                                    transition={{ delay: 0.5 + index * 0.2, duration: 0.6, ease: "easeOut" }}
                                >
                                    ↓
                                </motion.div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </motion.div>
        </section>
    );
};

export default OnboardingDiscoveryPostSpark;
