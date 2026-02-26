import { useEffect } from "react";
import { Link } from "react-router-dom";
import AppNav from "@/components/AppNav";
import HeroSection from "@/components/HeroSection";
import HowSparksWork from "@/components/HowSparksWork";
import OnboardingDiscoveryPostSpark from "@/components/OnboardingDiscoveryPostSpark";
import SafetyWaitlistSection from "@/components/SafetyWaitlistSection";
import SparkCallHero from "@/components/SparkCallHero";
import { trackEvent } from "@/lib/analytics";

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
