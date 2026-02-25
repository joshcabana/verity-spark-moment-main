import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import AppNav from "@/components/AppNav";
import { trackEvent } from "@/lib/analytics";
import HeroSection from "@/components/HeroSection"; // Import the new HeroSection
import HowSparksWork from "@/components/HowSparksWork"; // Import the new HowSparksWork
import SparkCallHero from "@/components/SparkCallHero"; // Import the new SparkCallHero
import OnboardingDiscoveryPostSpark from "@/components/OnboardingDiscoveryPostSpark"; // Import the new OnboardingDiscoveryPostSpark







const Landing = () => {
  const prefersReducedMotion = useReducedMotion();


  useEffect(() => {
    trackEvent("landing_view", { page: "landing_quantum" });
  }, []);





  return (
    <main id="main-content" className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <HeroSection />

      <HowSparksWork />

      <SparkCallHero />

      <OnboardingDiscoveryPostSpark />

      <OnboardingDiscoveryPostSpark />

      <section className="border-t border-white/10 bg-[#0a0a0a] px-6 py-12">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-sm sm:flex-row">
          <p className="font-semibold tracking-wide text-white">Verity · Quantum Spark</p>
          <div className="flex items-center gap-5 text-white/70">
            <Link to="/privacy" className="transition-colors hover:text-white">
              Privacy
            </Link>
            <Link to="/terms" className="transition-colors hover:text-white">
              Terms
            </Link>
            <Link to="/safety" className="transition-colors hover:text-white">
              Safety
            </Link>
            <Link to="/transparency" className="transition-colors hover:text-white">
              Transparency
            </Link>
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-3 md:hidden">
        <Link
          to="/auth?mode=signup"
          onClick={() => trackEvent("landing_primary_cta_clicked", { placement: "sticky_mobile" })}
          className="flex items-center justify-center gap-2 rounded-full bg-gradient-spark py-3.5 font-semibold text-[#060606] shadow-[0_10px_36px_rgba(52,211,153,0.35)]"
        >
          Start your first Spark
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="pb-24 md:pb-0" />
      <AppNav />
    </main>
  );
};

export default Landing;
