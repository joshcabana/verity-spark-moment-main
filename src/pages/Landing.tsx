import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import AppNav from "@/components/AppNav";
import { trackEvent } from "@/lib/analytics";
import HeroSection from "@/components/HeroSection"; // Import the new HeroSection
import HowSparksWork from "@/components/HowSparksWork"; // Import the new HowSparksWork
import SparkCallHero from "@/components/SparkCallHero"; // Import the new SparkCallHero
import OnboardingDiscoveryPostSpark from "@/components/OnboardingDiscoveryPostSpark"; // Import the new OnboardingDiscoveryPostSpark





const waitlistStats = [
  { label: "Pilot cities", value: "Sydney + Canberra" },
  { label: "Spark window", value: "45 seconds" },
  { label: "Reveal trigger", value: "15 seconds" },
  { label: "Swipe loops", value: "0" },
];

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

      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl rounded-3xl border border-white/15 bg-[linear-gradient(135deg,rgba(52,211,153,0.14),rgba(217,70,239,0.14))] p-8 md:p-12">
          <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-white/70">Private beta · now running</p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-white md:text-5xl">
                Accepting pilot users in Sydney + Canberra
              </h2>
              <p className="mt-4 max-w-2xl text-white/78">
                Limited invitation windows unlock in waves. Join early, secure priority access, and enter the
                anti-swipe network before public launch.
              </p>

              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <Link
                  to="/auth?mode=signup&waitlist=1"
                  onClick={() => trackEvent("landing_waitlist_cta_clicked", { placement: "fomo_panel" })}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#070707] transition-transform hover:scale-[1.02]"
                >
                  Reserve pilot access
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/safety"
                  className="rounded-full border border-white/25 px-6 py-3 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
                >
                  Safety architecture
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {waitlistStats.map((item) => (
                <div key={item.label} className="glass-card rounded-2xl p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/65">{item.label}</p>
                  <p className="mt-1 text-lg font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

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
