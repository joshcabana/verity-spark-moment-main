import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import AppNav from "@/components/AppNav";
import { trackEvent } from "@/lib/analytics";
import HeroSection from "@/components/HeroSection"; // Import the new HeroSection
import HowSparksWork from "@/components/HowSparksWork"; // Import the new HowSparksWork
import SparkCallHero from "@/components/SparkCallHero"; // Import the new SparkCallHero
import OnboardingDiscoveryPostSpark from "@/components/OnboardingDiscoveryPostSpark"; // Import the new OnboardingDiscoveryPostSpark
import SafetyWaitlistSection from "@/components/SafetyWaitlistSection"; // Import the new SafetyWaitlistSection







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

      <SafetyWaitlistSection />

      <div className="pb-24 md:pb-0" />
      <AppNav />
    </main>
  );
};

export default Landing;
