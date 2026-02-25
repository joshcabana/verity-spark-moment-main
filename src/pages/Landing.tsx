import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  EyeOff,
  Flame,
  LockKeyhole,
  Shield,
  Sparkles,
  Star,
  Users2,
  Video,
  Zap,
} from "lucide-react";
import AppNav from "@/components/AppNav";
import { trackEvent } from "@/lib/analytics";

const trustPills = [
  { icon: Shield, label: "Live safety layer" },
  { icon: LockKeyhole, label: "Identity locked pre-match" },
  { icon: EyeOff, label: "Anonymous first minute" },
  { icon: CheckCircle2, label: "Mutual-only reveal" },
];

const heroMetrics = [
  { value: "45s", label: "first-contact window" },
  { value: "3", label: "clear outcomes per call" },
  { value: "0", label: "swipe loops" },
  { value: "18+", label: "safety-gated experience" },
];

const roomLabels = [
  "Night Owls",
  "Design + Product",
  "Creatives",
  "Over 30",
  "Introvert Hour",
  "New in Town",
  "Sunday Reset",
  "Bookish",
];

const flowSteps = [
  {
    icon: Users2,
    title: "Enter a live room",
    body: "No profile theater. Join instantly and match with someone available now.",
  },
  {
    icon: Video,
    title: "45-second face-to-face",
    body: "A full-screen timed call surfaces chemistry quickly and cleanly.",
  },
  {
    icon: Sparkles,
    title: "Private mutual decision",
    body: "Only when both choose yes does identity and chat unlock.",
  },
];

const principles = [
  {
    title: "Signal > noise",
    text: "Short live interactions reveal compatibility faster than long profile chats.",
  },
  {
    title: "Safety by default",
    text: "Moderation pathways, safe-exit controls, and report tooling are built into every call.",
  },
  {
    title: "Anti-addictive design",
    text: "Finite sessions and explicit outcomes replace endless feeds and compulsive loops.",
  },
  {
    title: "Intentional pacing",
    text: "You get meaningful moments, not a treadmill of low-value interactions.",
  },
  {
    title: "Contextual rooms",
    text: "Shared context lowers social friction and increases relevance from the first hello.",
  },
  {
    title: "Production-grade UX",
    text: "Performance, accessibility, and clear system states are part of the product contract.",
  },
];

const testimonials = [
  {
    quote: "I learned more in one 45-second call than in two weeks of profile messaging.",
    person: "Aly, 29",
    city: "Sydney",
  },
  {
    quote: "It feels respectful. You either connect quickly or move on with no emotional drag.",
    person: "Mason, 34",
    city: "Melbourne",
  },
  {
    quote: "The moderation and safe-exit controls made me comfortable showing up as myself.",
    person: "Priya, 31",
    city: "Brisbane",
  },
];

const faqs = [
  {
    q: "Are calls recorded?",
    a: "Calls are not recorded by default. Safety systems inspect transient live signals to enforce policy.",
  },
  {
    q: "Can someone see my profile before a mutual decision?",
    a: "No. Identity remains locked until both people explicitly choose to continue.",
  },
  {
    q: "What if behavior crosses a line?",
    a: "Use Safe Exit immediately and report. Enforcement uses automated checks and human review.",
  },
  {
    q: "Why keep first contact to 45 seconds?",
    a: "It removes performative pre-chat and surfaces genuine chemistry quickly.",
  },
];

const Landing = () => {
  const prefersReducedMotion = useReducedMotion();
  const [videoEnabled, setVideoEnabled] = useState(true);
  const heroRef = useRef<HTMLElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroMediaY = useTransform(scrollYProgress, [0, 1], [0, prefersReducedMotion ? 0 : 100]);
  const orbOneY = useTransform(scrollYProgress, [0, 1], [0, prefersReducedMotion ? 0 : 180]);
  const orbTwoY = useTransform(scrollYProgress, [0, 1], [0, prefersReducedMotion ? 0 : 120]);

  useEffect(() => {
    trackEvent("landing_view", { page: "landing" });

    if (prefersReducedMotion) {
      setVideoEnabled(false);
    }

    const milestones = new Set<number>();
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const viewport = window.innerHeight;
      const fullHeight = document.documentElement.scrollHeight;
      const pct = Math.min(100, Math.round(((scrollTop + viewport) / fullHeight) * 100));

      [25, 50, 75, 100].forEach((threshold) => {
        if (pct >= threshold && !milestones.has(threshold)) {
          milestones.add(threshold);
          trackEvent("landing_scroll_depth", { percent: threshold });
        }
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [prefersReducedMotion]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <section ref={heroRef} className="relative min-h-screen overflow-hidden">
        <motion.div className="absolute inset-0" style={prefersReducedMotion ? undefined : { y: heroMediaY }}>
          {videoEnabled ? (
            <video
              className="h-full w-full object-cover object-center"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster="/Verity_Hero.webp"
              onError={() => setVideoEnabled(false)}
            >
              <source src="/hero-loop.webm" type="video/webm" />
              <source src="/hero-loop.mp4" type="video/mp4" />
            </video>
          ) : (
            <img
              src="/Verity_Hero.webp"
              alt="Two people in a live call experience"
              loading="eager"
              fetchPriority="high"
              className="h-full w-full object-cover object-center"
            />
          )}

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,hsl(38_90%_55%_/_0.32),transparent_40%),radial-gradient(circle_at_80%_8%,hsl(25_80%_55%_/_0.28),transparent_38%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/72 to-background" />
        </motion.div>

        <motion.div
          className="pointer-events-none absolute -left-24 top-24 h-80 w-80 rounded-full bg-primary/20 blur-3xl"
          style={prefersReducedMotion ? undefined : { y: orbOneY }}
        />
        <motion.div
          className="pointer-events-none absolute -right-24 top-40 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl"
          style={prefersReducedMotion ? undefined : { y: orbTwoY }}
        />

        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 pb-24 pt-20 md:pb-20">
          <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: "easeOut" }}
            >
              <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs uppercase tracking-[0.22em] text-white/90">
                <Zap className="h-3.5 w-3.5 text-primary" />
                Intentional Dating Infrastructure
              </p>

              <h1 className="mt-5 max-w-3xl font-display text-5xl font-bold tracking-tight text-white md:text-7xl">
                Meet in <span className="text-gradient-gold">45 Seconds</span>,
                <br />
                Not 45 Swipes.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85 md:text-xl">
                A polished, live-first social layer where people connect through presence, not profile performance.
                Clear outcomes, safer interactions, and dramatically less emotional noise.
              </p>

              <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <Link
                  to="/auth?mode=signup"
                  aria-label="Start your first Spark"
                  onClick={() => trackEvent("landing_primary_cta_clicked", { placement: "hero" })}
                  className="group inline-flex items-center gap-2 rounded-full bg-gradient-gold px-8 py-4 text-base font-semibold text-primary-foreground glow-gold transition-transform hover:scale-[1.02]"
                >
                  Start your first Spark
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  to="/safety"
                  onClick={() => trackEvent("landing_safety_clicked", { placement: "hero" })}
                  className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3 text-sm font-medium text-white/90 transition-colors hover:bg-white/15"
                >
                  <Shield className="h-4 w-4" />
                  Safety and moderation
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-2">
                {trustPills.map((pill) => (
                  <span
                    key={pill.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-xs text-white/90"
                  >
                    <pill.icon className="h-3.5 w-3.5 text-primary" />
                    {pill.label}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.aside
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
              className="glass-card relative overflow-hidden rounded-3xl border-white/10 p-6 md:p-8"
            >
              <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary/15 blur-3xl" />
              <p className="text-xs uppercase tracking-[0.2em] text-white/65">Live right now</p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-white">Tonight&apos;s flow</h2>

              <div className="mt-6 space-y-4">
                {[
                  "Join an active room in under 10 seconds",
                  "Get one focused 45-second introduction",
                  "Choose continue, chat, or pass privately",
                  "Only mutual yes unlocks identity",
                ].map((line) => (
                  <div key={line} className="flex items-start gap-3 text-sm text-white/85">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{line}</span>
                  </div>
                ))}
              </div>

              <div className="mt-7 rounded-2xl border border-white/10 bg-black/35 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-white/60">Current room pulse</p>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  {[
                    { label: "Avg wait", value: "14s" },
                    { label: "Live rooms", value: "12" },
                    { label: "Mutual yes", value: "37%" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-white/10 bg-black/40 p-3 text-center">
                      <p className="text-lg font-semibold text-primary">{item.value}</p>
                      <p className="mt-1 text-[11px] text-white/70">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.aside>
          </div>
        </div>
      </section>

      <section className="border-y border-border/40 bg-verity-surface/40 px-6 py-16">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 md:grid-cols-4">
          {heroMetrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="text-center"
            >
              <p className="text-3xl font-bold text-gradient-gold md:text-4xl">{metric.value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{metric.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden border-b border-border/30 bg-verity-surface px-6 py-4">
        <div className="mx-auto max-w-6xl">
          {prefersReducedMotion ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {roomLabels.map((room) => (
                <span key={room} className="rounded-full border border-border/60 bg-card/80 px-3 py-1 text-xs">
                  {room}
                </span>
              ))}
            </div>
          ) : (
            <motion.div
              className="flex w-max items-center gap-2"
              animate={{ x: [0, -420] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              {[...roomLabels, ...roomLabels].map((room, idx) => (
                <span
                  key={`${room}-${idx}`}
                  className="rounded-full border border-border/60 bg-card/80 px-3 py-1 text-xs text-foreground/85"
                >
                  {room}
                </span>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-5xl">
            Built for <span className="text-gradient-gold">clarity in motion</span>
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-muted-foreground">
            A deterministic first-minute flow that removes ambiguity and keeps people in control.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-6xl gap-5 md:grid-cols-3">
          {flowSteps.map((step, index) => (
            <motion.article
              key={step.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="glass-card rounded-2xl p-6"
            >
              <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-2.5">
                <step.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display text-2xl font-semibold">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="bg-verity-surface px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-border/50 px-4 py-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5 text-primary" />
              Product principles
            </p>
            <h2 className="mt-4 font-display text-3xl font-bold md:text-5xl">
              Design choices that protect your <span className="text-gradient-gold">attention</span>
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {principles.map((item, index) => (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06 }}
                className="glass-card rounded-2xl p-6 transition-colors hover:border-primary/35"
              >
                <h3 className="font-display text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center font-display text-3xl font-bold md:text-5xl">
            Early user signal, <span className="text-gradient-gold">not vanity metrics</span>
          </h2>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((entry, index) => (
              <motion.blockquote
                key={entry.person}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
                className="rounded-2xl border border-border/50 bg-card/70 p-6"
              >
                <Star className="mb-3 h-4 w-4 text-primary" />
                <p className="text-sm leading-relaxed text-foreground/90">“{entry.quote}”</p>
                <footer className="mt-5 text-xs text-muted-foreground">
                  {entry.person} · {entry.city}
                </footer>
              </motion.blockquote>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border/30 bg-verity-surface/70 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center font-display text-3xl font-bold md:text-5xl">FAQ</h2>
          <div className="mt-10 grid gap-4">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="rounded-2xl border border-border/50 bg-card/70 p-5"
                onToggle={(event) => {
                  if ((event.currentTarget as HTMLDetailsElement).open) {
                    trackEvent("landing_faq_opened", { question: faq.q });
                  }
                }}
              >
                <summary className="cursor-pointer list-none text-sm font-semibold text-foreground md:text-base">
                  {faq.q}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl"
        >
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <Flame className="h-3.5 w-3.5 text-primary" />
            Real connection, less noise
          </p>

          <h2 className="font-display text-4xl font-bold md:text-6xl">
            Ready for a <span className="text-gradient-gold">better first minute</span>?
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Start with one intentional conversation and let mutual signal decide what comes next.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/auth?mode=signup"
              aria-label="Create your Verity account"
              onClick={() => trackEvent("landing_primary_cta_clicked", { placement: "footer" })}
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-gold px-10 py-4 text-base font-semibold text-primary-foreground glow-gold transition-transform hover:scale-[1.02]"
            >
              Start your first Spark
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/transparency"
              onClick={() => trackEvent("landing_secondary_cta_clicked", { placement: "footer" })}
              className="rounded-full border border-border/60 px-7 py-3 text-sm font-medium text-foreground/85 transition-colors hover:bg-card"
            >
              Read transparency notes
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="border-t border-border/30 bg-verity-surface px-6 py-12">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-sm sm:flex-row">
          <p className="font-medium">Verity</p>
          <div className="flex items-center gap-5">
            <Link to="/privacy" className="text-muted-foreground transition-colors hover:text-foreground">
              Privacy
            </Link>
            <Link to="/terms" className="text-muted-foreground transition-colors hover:text-foreground">
              Terms
            </Link>
            <Link to="/safety" className="text-muted-foreground transition-colors hover:text-foreground">
              Safety
            </Link>
            <Link to="/transparency" className="text-muted-foreground transition-colors hover:text-foreground">
              Transparency
            </Link>
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-3 md:hidden">
        <Link
          to="/auth?mode=signup"
          aria-label="Start your first Spark from mobile quick action"
          onClick={() => trackEvent("landing_primary_cta_clicked", { placement: "sticky_mobile" })}
          className="flex items-center justify-center gap-2 rounded-full bg-gradient-gold py-3.5 font-semibold text-primary-foreground shadow-lg"
        >
          Start your first Spark
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="pb-24 md:pb-0" />
      <AppNav />
    </div>
  );
};

export default Landing;
