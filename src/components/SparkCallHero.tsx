import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const SparkCallHero: React.FC = () => {
    const [ref, inView] = useInView({
        triggerOnce: true,
        threshold: 0.1,
    });

    const containerVariants = {
        hidden: { opacity: 0, y: 50 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut", delay: 0.2 } },
    };

    const timerVariants = {
        initial: { opacity: 0, scale: 0.8 },
        animate: {
            opacity: 1, scale: 1,
            transition: { duration: 0.5, ease: "easeOut" }
        },
        pulse: {
            scale: [1, 1.05, 1],
            opacity: [1, 0.9, 1],
            transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
        }
    };

    const orbVariants = {
        hidden: { scale: 0.1, opacity: 0 },
        converge: {
            scale: [0.1, 1.2, 1],
            opacity: [0, 1, 0],
            transition: { duration: 1, ease: "easeOut", delay: 0.5 }
        },
    };

    const flashVariants = {
        hidden: { opacity: 0 },
        reveal: { opacity: [0, 1, 0], transition: { duration: 0.3, ease: "easeOut", delay: 1.5 } },
    };

    const messageVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut", delay: 1.8 } },
    };

    return (
        <section className="py-20 px-6 bg-dark-charcoal text-text-light">
            <motion.div
                ref={ref}
                initial="hidden"
                animate={inView ? "visible" : "hidden"}
                variants={containerVariants}
                className="max-w-6xl mx-auto grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center"
            >
                {/* Left Content Area */}
                <motion.div variants={containerVariants}>
                    <p className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-1 text-xs uppercase tracking-[0.2em] text-white/65">
                        <motion.span className="h-3.5 w-3.5 text-neon-green"><i className="lucide lucide-clock-3"></i></motion.span>
                        Cinematic Spark Call
                    </p>
                    <h2 className="mt-4 font-montserrat text-5xl text-white md:text-6xl">
                        The 45-second moment that decides everything
                    </h2>
                    <p className="mt-5 text-lg leading-relaxed text-text-medium">
                        Orb convergence at 15 seconds triggers a reveal flash and confetti burst. The flow is designed to
                        reduce anxiety, increase clarity, and create one decisive mutual yes/no outcome.
                    </p>

                    <ul className="mt-6 space-y-3 text-sm text-text-medium">
                        {[{
                            icon: '✔',
                            label: "Circular gradient timer with high-contrast readability"
                        },
                        {
                            icon: '✔',
                            label: "Orb explosion + reveal flash sequence at 15 seconds"
                        },
                        {
                            icon: '✔',
                            label: "Confetti burst on successful reveal to reinforce positive signal"
                        },
                        {
                            icon: '✔',
                            label: "Glassmorphism interaction layer with reduced-motion safety"
                        },
                        ].map((item, index) => (
                            <motion.li
                                key={index}
                                className="inline-flex items-start gap-2"
                                initial="hidden"
                                animate={inView ? "visible" : "hidden"}
                                variants={itemVariants} // Reusing itemVariants from HowSparksWork, or define new if needed
                                transition={{ delay: 0.3 + index * 0.1 }}
                            >
                                <span className="mt-0.5 h-4 w-4 shrink-0 text-neon-green">{item.icon}</span>
                                <span>{item.label}</span>
                            </motion.li>
                        ))}
                    </ul>
                </motion.div>

                {/* Right Visual Area - Spark Call Mockup */}
                <motion.div
                    className="relative w-full h-[500px] flex flex-col justify-center items-center rounded-2xl overflow-hidden bg-dark-charcoal/70 border border-electric-violet/30 shadow-xl"
                    variants={containerVariants}
                    transition={{ delay: 0.4 }}
                >
                    {/* Video Streams Placeholder */}
                    <div className="absolute inset-0 flex items-center justify-center gap-4 p-4">
                        <div className="flex-1 bg-gray-700 h-full rounded-lg flex items-center justify-center text-text-dark">Opponent Stream</div>
                        <div className="absolute bottom-8 right-8 w-1/4 h-1/4 bg-gray-800 rounded-lg flex items-center justify-center text-text-dark border-2 border-neon-green">Your Stream</div>
                    </div>

                    {/* Timer Display */} 
                    <motion.div
                        className="absolute font-montserrat font-extrabold text-7xl text-neon-green drop-shadow-neon z-10"
                        initial="initial"
                        animate={inView ? "pulse" : "initial"}
                        variants={timerVariants}
                    >
                        30s
                    </motion.div>

                    {/* Orb Convergence Indicator */}
                    <motion.div
                        className="absolute w-40 h-40 rounded-full z-20 pointer-events-none"
                        style={{
                            background: 'radial-gradient(circle, rgba(138,43,226,0.8) 0%, rgba(255,69,0,0) 70%)'
                        }}
                        initial="hidden"
                        animate={inView ? "converge" : "hidden"} // Will be triggered by time in actual app
                        variants={orbVariants}
                    ></motion.div>

                    {/* Reveal Flash */}
                    <motion.div
                        className="absolute inset-0 bg-white z-30 pointer-events-none"
                        initial="hidden"
                        animate={inView ? "reveal" : "hidden"} // Will be triggered by time in actual app
                        variants={flashVariants}
                    ></motion.div>

                    {/* Post-Reveal Message */}
                    <motion.div
                        className="absolute font-montserrat text-3xl text-white drop-shadow-lg z-40"
                        initial="hidden"
                        animate={inView ? "visible" : "hidden"} // Will be triggered by time in actual app
                        variants={messageVariants}
                    >
                        Mutual Reveal Unlocked!
                    </motion.div>

                    {/* Controls Placeholder */}
                    <div className="absolute bottom-4 z-50 flex gap-4 bg-dark-charcoal/50 backdrop-blur-md rounded-full px-6 py-3 border border-white/10">
                        <button className="p-3 rounded-full bg-white/20 text-white text-xl">🎤</button>
                        <button className="p-3 rounded-full bg-white/20 text-white text-xl">📹</button>
                        <button className="p-3 rounded-full bg-fiery-orange text-white text-xl">📞</button>
                        <button className="p-3 rounded-full bg-neon-green text-white text-xl">➡️</button>
                    </div>
                </motion.div>
            </motion.div>
        </section>
    );
};

export default SparkCallHero;
