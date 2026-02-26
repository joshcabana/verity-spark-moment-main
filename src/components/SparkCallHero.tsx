import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Clock, CheckCircle2, Sparkle, PartyPopper, Star, Mic, Video, PhoneOff, ArrowRight } from 'lucide-react'; // Import Lucide icons

const SparkCallHero: React.FC = () => {
    const [ref, inView] = useInView({
        triggerOnce: true,
        threshold: 0.1,
    });

    const containerVariants = {
        hidden: { opacity: 0, y: 50 },
        visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 15, delay: 0.2 } },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } },
    };

    const timerVariants = {
        initial: { opacity: 0, scale: 0.8 },
        animate: {
            opacity: 1, scale: 1,
            transition: { type: "spring", stiffness: 100, damping: 15 }
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
            scale: [0.1, 1.5, 0.9], // More dramatic growth and subtle shrink
            opacity: [0, 1, 0.7], // Hold opacity slightly longer for reveal
            transition: { duration: 1.2, ease: "easeOut" } // Slightly longer, smoother transition
        },
    };

    const flashVariants = {
        hidden: { opacity: 0 },
        reveal: { opacity: [0, 1, 0], transition: { duration: 0.4, ease: "easeOut", delay: 0.9 } }, // Slightly longer, delayed flash
    };

    const messageVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15, delay: 1 } }, // Adjusted delay
    };

    const controlButtonVariants = {
        hover: {
            scale: 1.1,
            boxShadow: "0 0 15px hsla(var(--luxury-gold),0.6), 0 0 30px hsla(var(--luxury-gold),0.35)",
            transition: { duration: 0.2 }
        },
        tap: {
            scale: 0.9
        }
    };

    return (
        <section className="py-20 px-6 bg-background text-foreground">
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
                        <Clock className="h-3.5 w-3.5 text-luxury-gold-light" />
                        Cinematic Spark Call
                    </p>
                    <h2 className="mt-4 font-montserrat text-6xl text-gradient-gold md:text-7xl">
                        The 45-second moment that decides everything
                    </h2>
                    <p className="mt-5 text-lg leading-relaxed text-light-grey">
                        Orb convergence at 15 seconds triggers a reveal flash and confetti burst. The flow is designed to
                        reduce anxiety, increase clarity, and create one decisive mutual yes/no outcome.
                    </p>

                    <ul className="mt-6 space-y-3 text-sm text-light-grey">
                        {[{
                            icon: <CheckCircle2 className="w-4 h-4" />,
                            label: "Circular gradient timer with high-contrast readability"
                        },
                        {
                            icon: <Sparkle className="w-4 h-4" />,
                            label: "Orb explosion + reveal flash sequence at 15 seconds"
                        },
                        {
                            icon: <PartyPopper className="w-4 h-4" />,
                            label: "Confetti burst on successful reveal to reinforce positive signal"
                        },
                        {
                            icon: <Star className="w-4 h-4" />,
                            label: "Glassmorphism interaction layer with reduced-motion safety"
                        },
                        ].map((item, index) => (
                            <motion.li
                                key={index}
                                className="inline-flex items-start gap-2"
                                initial="hidden" // Ensure initial state is hidden
                                animate={inView ? "visible" : "hidden"} // Animate when in view
                                variants={itemVariants} // Use item variants
                                transition={{ delay: 0.3 + index * 0.1 }} // Staggered reveal
                            >
                                <span className="mt-0.5 h-4 w-4 shrink-0 text-luxury-gold-light">{item.icon}</span> {/* Render Lucide icon component */}
                                <span>{item.label}</span>
                            </motion.li>
                        ))}
                    </ul>
                </motion.div>

                {/* Right Visual Area - Spark Call Mockup */}
                <motion.div
                    className="relative w-full h-[500px] flex flex-col justify-center items-center rounded-2xl overflow-hidden bg-card/70 border border-luxury-gold/30 shadow-xl backdrop-blur-md"
                    variants={containerVariants}
                    transition={{ delay: 0.4 }}
                >
                    {/* Video Streams Placeholder */}
                    <div className="absolute inset-0 flex items-center justify-center gap-4 p-4 z-0">
                        {/* Opponent Stream Placeholder with Glassmorphism */}
                        <div className="flex-1 h-full rounded-lg bg-white/5 backdrop-blur-sm flex items-center justify-center text-text-dark border border-white/10 shadow-inner">
                            <span className="text-sm text-white/50">Opponent Stream</span>
                        </div>
                        {/* Your Stream Placeholder with Glassmorphism */}
                        <div className="absolute bottom-8 right-8 w-1/4 h-1/4 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center text-text-dark border-2 border-luxury-gold shadow-lg">
                            <span className="text-xs text-white/70">Your Stream</span>
                        </div>
                    </div>

                    {/* Timer Display */} 
                    <motion.div
                        className="absolute font-montserrat font-extrabold text-7xl text-luxury-gold-light drop-shadow-gold z-10"
                        initial="initial"
                        animate={inView ? "pulse" : "initial"}
                        variants={timerVariants}
                    >
                        45s {/* Start at 45 seconds for cinematic effect */}
                    </motion.div>

                    {/* Orb Convergence Indicator */}
                    <motion.div
                        className="absolute w-40 h-40 rounded-full z-20 pointer-events-none"
                        style={{
                            background: `radial-gradient(circle, hsla(var(--verity-gold), 0.6) 0%, transparent 70%)`
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
                        <motion.button whileHover="hover" whileTap="tap" variants={controlButtonVariants} className="p-3 rounded-full bg-white/20 text-white text-xl"><Mic className="w-6 h-6" /></motion.button>
                        <motion.button whileHover="hover" whileTap="tap" variants={controlButtonVariants} className="p-3 rounded-full bg-white/20 text-white text-xl"><Video className="w-6 h-6" /></motion.button>
                        <motion.button whileHover="hover" whileTap="tap" variants={controlButtonVariants} className="p-3 rounded-full bg-luxury-gold-deep text-white text-xl"><PhoneOff className="w-6 h-6" /></motion.button>
                        <motion.button whileHover="hover" whileTap="tap" variants={controlButtonVariants} className="p-3 rounded-full bg-luxury-gold text-white text-xl"><ArrowRight className="w-6 h-6" /></motion.button>
                    </div>
                </motion.div>
            </motion.div>
        </section>
    );
};

export default SparkCallHero;
