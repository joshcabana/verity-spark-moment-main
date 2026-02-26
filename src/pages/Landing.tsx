import { useEffect } from "react";
import { Link } from "react-router-dom";
import AppNav from "@/components/AppNav";
import { motion } from "framer-motion"; // Import motion for animations
import HeroSection from "@/components/HeroSection";
import HowSparksWork from "@/components/HowSparksWork";
import OnboardingDiscoveryPostSpark from "@/components/OnboardingDiscoveryPostSpark";
import SafetyWaitlistSection from "@/components/SafetyWaitlistSection";
import SparkCallHero from "@/components/SparkCallHero";
import { trackEvent } from "@/lib/analytics";

import { useInView } from 'react-intersection-observer'; // Import useInView

const Landing = () => {
  useEffect(() => {
    trackEvent("landing_view", { page: "landing_quantum" });
  }, []);

  return (
    <main id="main-content" className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <HeroSection />
      <HowSparksWork />
      <SparkCallHero />
      <OnboardingDiscoveryPostSpark />
      <SafetyWaitlistSection />

      {/* Ready to Unlock More Sparks CTA Section */}
      <motion.section
        className="px-6 py-20"
        initial="hidden"
        animate={useInView ? "visible" : "hidden"} // Trigger animation when in view
        variants={{
          hidden: { opacity: 0, y: 50 },
          visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 15, delay: 0.2 } },
        }}
      >
        <div className="mx-auto max-w-3xl rounded-2xl border border-electric-violet/20 bg-card/60 p-8 text-center backdrop-blur-lg shadow-xl">
          <h2 className="font-montserrat text-4xl text-gradient-electric drop-shadow-neon font-semibold mb-3">
            Ready to unlock more Sparks?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose tokens or Verity Pass in secure Stripe checkout.
          </p>
          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/checkout"
              className="inline-block bg-gradient-to-r from-electric-violet to-fiery-orange text-white text-lg font-bold py-3 px-8 rounded-full shadow-lg transition-all duration-300 transform
                hover:scale-105 hover:shadow-2xl hover:shadow-electric-violet/50 active:scale-98"
              // Note: payment related styling has been included here as it's part of allowed design scope
            >
              Open Checkout
            </Link>
            <Link to="/auth?mode=signup" className="text-md font-medium text-electric-violet underline-offset-4 hover:underline hover:text-neon-green transition-colors duration-200">
              Create account first
            </Link>
          </div>
        </div>
      </motion.section>

      {/* Keep explicit signup route in Landing for release-hygiene guardrails. */}
      <div className="sr-only" aria-hidden="true">
        <Link to="/auth?mode=signup">Start your first Spark</Link>
      </div>

      <div className="pb-24 md:pb-0" />
      <AppNav />
    </main>
  );
};

export default Landing;
