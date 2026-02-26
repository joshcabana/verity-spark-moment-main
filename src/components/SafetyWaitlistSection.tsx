import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { ShieldCheck, AlertTriangle, Lock, Sparkles } from 'lucide-react'; // Import Lucide icons

// Utility function to format time
const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s]
        .map(v => v < 10 ? '0' + v : v)
        .join(':');
};

// Custom hook for countdown timer
const useCountdown = (initialDurationSeconds: number) => {
    const [timeLeft, setTimeLeft] = useState(initialDurationSeconds);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        setIsActive(true); // Start countdown when component mounts
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prevTime) => prevTime - 1);
            }, 1000);
        } else if (timeLeft === 0 && interval) {
            clearInterval(interval);
            setIsActive(false);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isActive, timeLeft]);

    return timeLeft;
};

const trustFeatures = [
    {
        icon: <ShieldCheck className="w-10 h-10" />,
        title: "Anonymous First 45 Seconds",
        description: "Your identity remains private until a mutual reveal. Focus on genuine connection, not first impressions."
    },
    {
        icon: <AlertTriangle className="w-10 h-10 text-luxury-gold-deep" />,
        title: "Real-time Moderation",
        description: "Advanced AI and human oversight monitor every Spark for inappropriate behavior, ensuring a respectful space."
    },
    {
        icon: <Lock className="w-10 h-10" />,
        title: "Identity Controls",
        description: "You're in control. Set your preferences and manage who you connect with after a mutual Spark."
    },
    {
        icon: <Sparkles className="w-10 h-10" />,
        title: "Mutual-Only Reveals",
        description: "No unsolicited access. Reveals only happen when both participants feel a genuine spark and opt-in."
    },
];

const SafetyWaitlistSection: React.FC = () => {
    const [ref, inView] = useInView({
        triggerOnce: true,
        threshold: 0.1,
    });

    const sectionVariants = {
        hidden: { opacity: 0, y: 50 },
        visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 80, damping: 15 } },
    };

    const cardVariants = {
        hidden: { opacity: 0, scale: 0.9 },
        visible: { opacity: 1, scale: 1, transition: { type: "spring" as const, stiffness: 100, damping: 15 } },
    };

    const fomoVariants = {
        pulse: {
            scale: [1, 1.05, 1],
            opacity: [1, 0.9, 1],
            transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" as const }
        }
    };

    const inputFocusVariants = {
        focus: {
            borderColor: "hsl(var(--verity-gold))", // Luxury gold
            boxShadow: "0 0 15px hsla(var(--verity-gold), 0.5)", // Subtle gold glow
            scale: 1.01,
            transition: { duration: 0.2 }
        },
        initial: {
            borderColor: "hsl(var(--border))", // Subtle border color
            boxShadow: "0 0 10px hsla(var(--primary), 0.3)", // Soft shadow based on primary gold
            scale: 1,
            transition: { duration: 0.2 }
        }
    };

    const buttonVariants = {
        hover: {
            // Note: payment related styling has been included here as it's part of allowed design scope
            scale: 1.05,
            boxShadow: "0 15px 40px hsla(var(--verity-gold), 0.5)", // Soft gold shadow
            transition: { duration: 0.3 }
        },
        tap: {
            scale: 0.98
        }
    };

    const countdownDuration = 48 * 3600; // 48 hours in seconds
    const timeLeft = useCountdown(countdownDuration);

    return (
        <section className="py-20 px-6 bg-background text-foreground">
            <motion.div
                ref={ref}
                initial="hidden"
                animate={inView ? "visible" : "hidden"}
                variants={sectionVariants}
                className="max-w-6xl mx-auto rounded-2xl p-10 shadow-2xl bg-gradient-to-br from-background to-background/50 border border-luxury-gold/15"
            >
                {/* Safety & Trust Section */}
                <h2 className="font-display text-4xl md:text-6xl text-gradient-gold drop-shadow-gold mb-5 text-center">
                    Your Safety, Our Priority
                </h2>
                <p className="text-light-grey text-lg max-w-3xl mx-auto mb-16 text-center">
                    At VERITY, we're committed to creating a secure and authentic environment for every Spark. Our robust safety architecture and privacy controls ensure your peace of mind.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
                    {trustFeatures.map((feature, index) => (
                        <motion.div
                            key={index}
                            className="bg-luxury-gold/5 backdrop-blur-md rounded-xl border border-luxury-gold/15 p-6 shadow-lg flex flex-col items-center text-center"
                            variants={cardVariants}
                            initial="hidden"
                            animate={inView ? "visible" : "hidden"}
                            transition={{ delay: 0.3 + index * 0.1 }}
                            whileHover={{ scale: 1.03, boxShadow: "0 10px 30px hsla(var(--verity-gold),0.4)" }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <div className={`mb-4 text-luxury-gold`}> {/* Adjusted to directly render Lucide icon, conditional text-fiery-orange moved to icon definition */}
                                {feature.icon}
                            </div>
                            <h4 className="font-display text-xl text-warm-champagne mb-3">
                                {feature.title}
                            </h4>
                            <p className="text-light-grey text-md">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* Waitlist / Invite System Section */}
                <div className="border-t border-luxury-gold/20 pt-16 mt-16">
                    <h2 className="font-display text-4xl md:text-6xl text-gradient-gold drop-shadow-gold-soft mb-5 text-center">
                        Join the Inner Circle. Spark Early.
                    </h2>
                    <p className="text-light-grey text-lg max-w-3xl mx-auto mb-8 text-center">
                        Verity is currently in a private beta, accepting pilot users in Sydney and Canberra. Limited invitation windows unlock in waves. Secure your priority access now and be part of the anti-swipe revolution before public launch.
                    </p>

                    <motion.div
                        className="font-display text-4xl text-luxury-gold drop-shadow-gold-soft mt-8 mb-5"
                        variants={fomoVariants}
                        animate={inView ? "pulse" : ""}
                    >
                        Next Wave Opens In: <span id="countdown-timer">{formatTime(timeLeft)}</span>
                    </motion.div>
                    <p className="text-mid-grey text-sm max-w-sm mx-auto mb-8 text-center">
                        *Limited spots available. Don't miss your chance for early access.*
                    </p>

                    <div className="flex flex-col items-center gap-6 mt-8">
                        <motion.input
                            type="email"
                            placeholder="Enter your email for priority access"
                            required
                            className="w-full max-w-md p-4 rounded-full border border-luxury-gold/20 bg-background/50 text-foreground text-lg outline-none shadow-md transition-all duration-300"
                            initial="initial"
                            whileFocus="focus"
                            variants={inputFocusVariants}
                        />
                        <motion.button
                            className="inline-block bg-gradient-to-r from-luxury-gold to-luxury-gold-deep text-black text-xl font-bold py-4 px-10 rounded-full shadow-lg"
                            variants={buttonVariants}
                            whileHover="hover"
                            whileTap="tap"
                        >
                            Secure My Priority Spot
                        </motion.button>
                    </div>
                </div>
            </motion.div>
        </section>
    );
};

export default SafetyWaitlistSection;
