import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { ShieldCheck, AlertTriangle, Lock, Sparkles } from 'lucide-react'; // Import Lucide icons

const trustFeatures = [
    {
        icon: <ShieldCheck className="w-10 h-10" />,
        title: "Anonymous First 45 Seconds",
        description: "Your identity remains private until a mutual reveal. Focus on genuine connection, not first impressions."
    },
    {
        icon: <AlertTriangle className="w-10 h-10 text-fiery-orange" />,
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
        visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 15 } },
    };

    const cardVariants = {
        hidden: { opacity: 0, scale: 0.9 },
        visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 100, damping: 15 } },
    };

    const fomoVariants = {
        pulse: {
            scale: [1, 1.05, 1],
            opacity: [1, 0.9, 1],
            transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
        }
    };

    const inputFocusVariants = {
        focus: {
            borderColor: "#39FF14", // neon-green
            boxShadow: "0 0 15px rgba(57,255,20,0.5)",
            scale: 1.01,
            transition: { duration: 0.2 }
        },
        initial: {
            borderColor: "#8A2BE2", // electric-violet
            boxShadow: "0 0 10px rgba(138,43,226,0.3)",
            scale: 1,
            transition: { duration: 0.2 }
        }
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
        <section className="py-20 px-6 bg-dark-charcoal text-text-light">
            <motion.div
                ref={ref}
                initial="hidden"
                animate={inView ? "visible" : "hidden"}
                variants={sectionVariants}
                className="max-w-6xl mx-auto rounded-2xl p-10 shadow-2xl bg-gradient-to-br from-dark-charcoal to-dark-charcoal/50 border border-electric-violet/20"
            >
                {/* Safety & Trust Section */}
                <h2 className="font-montserrat text-6xl text-gradient-electric drop-shadow-neon mb-5 text-center">
                    Your Safety, Our Priority
                </h2>
                <p className="text-text-medium text-lg max-w-3xl mx-auto mb-16 text-center">
                    At VERITY, we're committed to creating a secure and authentic environment for every Spark. Our robust safety architecture and privacy controls ensure your peace of mind.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
                    {trustFeatures.map((feature, index) => (
                        <motion.div
                            key={index}
                            className="bg-electric-violet/10 backdrop-blur-md rounded-xl border border-electric-violet/20 p-6 shadow-lg flex flex-col items-center text-center"
                            variants={cardVariants}
                            initial="hidden"
                            animate={inView ? "visible" : "hidden"}
                            transition={{ delay: 0.3 + index * 0.1 }}
                            whileHover={{ scale: 1.03, boxShadow: "0 10px 30px rgba(138,43,226,0.4)" }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <div className={`mb-4 text-neon-green`}> {/* Adjusted to directly render Lucide icon, conditional text-fiery-orange moved to icon definition */}
                                {feature.icon}
                            </div>
                            <h4 className="font-montserrat text-xl text-text-light mb-3">
                                {feature.title}
                            </h4>
                            <p className="text-text-medium text-md">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* Waitlist / Invite System Section */}
                <div className="border-t border-electric-violet/30 pt-16 mt-16">
                    <h2 className="font-montserrat text-6xl text-gradient-electric drop-shadow-electric mb-5 text-center">
                        Join the Inner Circle. Spark Early.
                    </h2>
                    <p className="text-text-medium text-lg max-w-3xl mx-auto mb-8 text-center">
                        Verity is currently in a private beta, accepting pilot users in Sydney and Canberra. Limited invitation windows unlock in waves. Secure your priority access now and be part of the anti-swipe revolution before public launch.
                    </p>

                    <motion.div
                        className="font-montserrat text-4xl text-fiery-orange drop-shadow-electric mt-8 mb-5"
                        variants={fomoVariants}
                        animate={inView ? "pulse" : ""}
                    >
                        Next Wave Opens In: <span id="countdown-timer">48:00:00</span>
                    </motion.div>
                    <p className="text-text-dark text-sm max-w-sm mx-auto mb-8 text-center">
                        *Limited spots available. Don't miss your chance for early access.*
                    </p>

                    <div className="flex flex-col items-center gap-6 mt-8">
                        <motion.input
                            type="email"
                            placeholder="Enter your email for priority access"
                            required
                            className="w-full max-w-md p-4 rounded-full border border-electric-violet bg-dark-charcoal/50 text-text-light text-lg outline-none shadow-md transition-all duration-300"
                            initial="initial"
                            whileFocus="focus"
                            variants={inputFocusVariants}
                        />
                        <motion.button
                            className="inline-block bg-gradient-to-r from-electric-violet to-fiery-orange text-white text-xl font-bold py-4 px-10 rounded-full shadow-lg"
                            variants={buttonVariants}
                            whileHover="hover"
                            whileTap="tap"
                        >
                            Secure My Priority Spot
                        </motion.button>
                    </div>
                </div>
            </motion.div>
            {/* Note: Dynamic client-side JavaScript is needed to power the countdown-timer element. */}
        </section>
    );
};

export default SafetyWaitlistSection;
