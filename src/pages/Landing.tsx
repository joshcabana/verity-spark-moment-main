import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  EyeOff,
  LockKeyhole,
  Shield,
  Sparkles,
  UserCheck,
  Video,
  Zap,
} from "lucide-react";
import AppNav from "@/components/AppNav";
import { trackEvent } from "@/lib/analytics";
import HeroSection from "@/components/HeroSection"; // Import the new HeroSection

const trustPills = [
  { icon: Shield, label: "Live trust + safety" },
  { icon: EyeOff, label: "Anonymous first 45 seconds" },
  { icon: LockKeyhole, label: "Mutual-only reveal" },
  { icon: UserCheck, label: "Identity controls" },
];

const sparkFlow = [
  {
    icon: Video,
    title: "Enter a live room",
    body: "Skip profile theater. Join instantly and meet someone who is present right now.",
  },
  {
    icon: Clock3,
    title: "45-second Spark Call",
    body: "A cinematic, focused call that reveals chemistry quickly without endless chat fatigue.",
  },
  {
    icon: Sparkles,
    title: "Orb convergence + reveal",
    body: "At 15 seconds, the timer explodes into a reveal moment and unlocks mutual continuation.",
  },
];

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

      <section className="border-b border-white/10 bg-[#0f0f0f] px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-1 text-xs uppercase tracking-[0.18em] text-white/65">
              <Sparkles className="h-3.5 w-3.5 text-[#d946ef]" />
              How Sparks Work
            </p>
            <h2 className="mt-4 font-display text-3xl font-semibold text-white md:text-5xl">
              Built for chemistry, not swipe fatigue
            </h2>
          </div>

          <div className="mx-auto mt-12 grid max-w-6xl gap-5 md:grid-cols-3">
            {sparkFlow.map((step, index) => (
              <motion.article
                key={step.title}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="glass-card rounded-2xl p-6"
              >
                <div className="mb-4 inline-flex rounded-xl bg-white/8 p-2.5">
                  <step.icon className="h-5 w-5 text-[#34d399]" />
                </div>
                <h3 className="font-display text-2xl font-semibold text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/72">{step.body}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 bg-[#0b0b0b] px-6 py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-1 text-xs uppercase tracking-[0.2em] text-white/65">
              <Clock3 className="h-3.5 w-3.5 text-[#34d399]" />
              Cinematic Spark Call
            </p>
            <h2 className="mt-4 font-display text-3xl font-semibold text-white md:text-5xl">
              The 45-second moment that decides everything
            </h2>
            <p className="mt-5 text-base leading-relaxed text-white/75 md:text-lg">
              Orb convergence at 15 seconds triggers a reveal flash and confetti burst. The flow is designed to
              reduce anxiety, increase clarity, and create one decisive mutual yes/no outcome.
            </p>

            <ul className="mt-6 space-y-3 text-sm text-white/80">
              {[
                "Circular gradient timer with high-contrast readability",
                "Orb explosion + reveal flash sequence at 15 seconds",
                "Confetti burst on successful reveal to reinforce positive signal",
                "Glassmorphism interaction layer with reduced-motion safety",
              ].map((item) => (
                <li key={item} className="inline-flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#34d399]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <SparkCallInterface className="h-full" />
        </div>
      </section>

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
