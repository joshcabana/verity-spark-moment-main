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

      <section className="px-6 pb-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-primary/20 bg-card/60 p-6 text-center backdrop-blur">
          <h2 className="font-display text-2xl font-semibold">Ready to unlock more Sparks?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose tokens or Verity Pass in secure Stripe checkout.
          </p>
          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/checkout"
              className="rounded-full bg-gradient-gold px-6 py-3 text-sm font-semibold text-primary-foreground glow-gold"
            >
              Open Checkout
            </Link>
            <Link to="/auth?mode=signup" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              Create account first
            </Link>
          </div>
        </div>
      </section>

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
