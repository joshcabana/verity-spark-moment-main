import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Shield,
  Clock,
  Eye,
  Users,
  Sparkles,
  Video,
  CheckCircle2,
  Siren,
  Lock,
} from "lucide-react";
import AppNav from "@/components/AppNav";
import { trackEvent } from "@/lib/analytics";

const stats = [
  { value: "78%", label: "of users burned out on traditional swipe apps" },
  { value: "45s", label: "to feel if there's a real spark" },
  { value: "18+", label: "adult-only, ID and behavior policy enforced" },
  { value: "0", label: "public profiles before mutual match" },
];

const trustPills = [
  { icon: Shield, label: "AI Moderated Calls" },
  { icon: Lock, label: "Anonymous Until Mutual" },
  { icon: Siren, label: "Safe Exit Always On" },
  { icon: CheckCircle2, label: "No Endless Swipe Loop" },
];

const features = [
  {
    icon: Video,
    title: "45-Second Live Video",
    description:
      "Full-screen, face-to-face. No filters, no bios, no curated lies. Just raw human presence.",
  },
  {
    icon: Eye,
    title: "Complete Anonymity",
    description:
      "No names, no handles, no photos upfront. Identity unlocks only on mutual match.",
  },
  {
    icon: Shield,
    title: "AI-Powered Safety",
    description:
      "Real-time moderation + report tooling + account consequences for abusive behavior.",
  },
  {
    icon: Clock,
    title: "No Addiction By Design",
    description:
      "Daily guardrails and no infinite swiping. High-intent interactions over dopamine loops.",
  },
  {
    icon: Users,
    title: "Themed Rooms",
    description:
      "Night Owls, Tech Professionals, Creatives & Makers, Over 35, Introvert Hours.",
  },
  {
    icon: Sparkles,
    title: "Spark Extension",
    description:
      "One free 90-second extension daily when both people want to keep talking.",
  },
];

const faqs = [
  {
    q: "Are calls recorded?",
    a: "Calls are not recorded by default. Moderation processes live frames transiently to enforce safety policies.",
  },
  {
    q: "Do people see my profile before matching?",
    a: "No. Verity is anonymous until both people mutually choose to match.",
  },
  {
    q: "What if someone behaves inappropriately?",
    a: "Use Safe Exit instantly and report. Automated + human review paths are built into enforcement.",
  },
  {
    q: "Why only 45 seconds?",
    a: "It removes performative chatting and surfaces genuine chemistry quickly.",
  },
];

const Landing = () => {
  const [videoEnabled, setVideoEnabled] = useState(true);

  useEffect(() => {
    trackEvent("landing_view", { page: "landing" });

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
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
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <section className="relative min-h-screen h-[100dvh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          {videoEnabled ? (
            <video
              className="w-full h-full object-cover object-[52%_24%] sm:object-[52%_22%] md:object-center"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster="/Verity_Hero.webp"
              onError={() => setVideoEnabled(false)}
            >
              <source src="/hero-loop.mp4" type="video/mp4" />
            </video>
          ) : (
            <motion.img
              src="/Verity_Hero.webp"
              alt="Two people connecting"
              loading="eager"
              fetchPriority="high"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="w-full h-full object-cover object-[52%_24%] sm:object-[52%_22%] md:object-center"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/65 to-black/85" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="font-display text-6xl md:text-8xl font-bold tracking-tight mb-2">
              <span className="text-gradient-gold">Verity</span>
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm tracking-[0.3em] uppercase mb-8">
              Real Eyes. Real Voice. Real Spark.
            </p>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-display text-2xl md:text-4xl text-foreground/95 leading-relaxed mb-6 italic"
          >
            "If there’s no spark in 45 seconds of real eyes and voice,
            <br className="hidden md:block" />
            there won’t be one after 45 swipes."
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.35 }}
            className="text-muted-foreground text-lg md:text-xl mb-10 max-w-2xl mx-auto"
          >
            Anonymous live video. No public profiles. No swipe treadmill. Just 45 seconds and a clear mutual decision.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="flex flex-col items-center justify-center gap-3"
          >
            <Link
              to="/auth?mode=signup"
              onClick={() => trackEvent("landing_primary_cta_clicked", { placement: "hero" })}
              className="group relative inline-flex items-center gap-3 bg-gradient-gold text-primary-foreground font-semibold text-lg px-10 py-4 rounded-full glow-gold transition-all hover:scale-105"
            >
              Try a 45s Spark
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/safety"
              onClick={() => trackEvent("landing_safety_clicked", { placement: "hero" })}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors px-3 py-1 text-sm"
            >
              <Shield className="w-4 h-4" />
              See safety + moderation details
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-2"
          >
            {trustPills.map((pill) => (
              <span
                key={pill.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-black/30 px-3 py-1.5 text-xs text-foreground/85"
              >
                <pill.icon className="w-3.5 h-3.5 text-primary" />
                {pill.label}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-16 px-6 border-y border-border/40 bg-verity-surface/40">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl md:text-4xl font-bold text-gradient-gold mb-2">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
            How <span className="text-gradient-gold">Verity</span> Works
          </h2>
          <p className="text-muted-foreground text-lg">Three steps. No games. Real connection.</p>
        </div>

        <div className="max-w-4xl mx-auto space-y-0">
          {[
            {
              step: "01",
              title: "Tap Go Live",
              desc: "No browsing. No swiping. No searching. Tap and get matched with someone who's ready now.",
            },
            {
              step: "02",
              title: "45 Seconds Face-to-Face",
              desc: "Full-screen anonymous live video with a clear timer. Be yourself. Decide quickly.",
            },
            {
              step: "03",
              title: "Match or Pass",
              desc: "Both decide privately. Only mutual sparks unlock identity and chat.",
            },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08 }}
              className="flex items-start gap-6 py-10 border-b border-border/30 last:border-0"
            >
              <span className="text-5xl font-display font-bold text-verity-gold-dim shrink-0">{item.step}</span>
              <div>
                <h3 className="font-display text-2xl font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="py-20 px-6 bg-verity-surface">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">Built Different</h2>
            <p className="text-muted-foreground text-lg">
              Every feature is designed to optimize trust, chemistry, and safety.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="glass-card rounded-2xl p-6 hover:border-primary/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-8 text-center">
            FAQ
          </h2>
          <div className="grid gap-4">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="rounded-2xl border border-border/50 bg-verity-surface/60 p-5"
                onToggle={(event) => {
                  const isOpen = (event.currentTarget as HTMLDetailsElement).open;
                  if (isOpen) {
                    trackEvent("landing_faq_opened", { question: faq.q });
                  }
                }}
              >
                <summary className="text-foreground font-semibold mb-2 cursor-pointer list-none">
                  {faq.q}
                </summary>
                <p className="text-muted-foreground text-sm leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 text-center border-t border-border/30">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-6">
            Ready for <span className="text-gradient-gold">Something Real?</span>
          </h2>
          <p className="text-muted-foreground text-lg mb-10">
            45 seconds. Real eyes. Real spark. No profile theatre.
          </p>
          <Link
            to="/auth?mode=signup"
            onClick={() => trackEvent("landing_primary_cta_clicked", { placement: "footer" })}
            className="group inline-flex items-center gap-3 bg-gradient-gold text-primary-foreground font-semibold text-lg px-12 py-5 rounded-full glow-gold transition-all hover:scale-105"
          >
            Try a 45s Spark
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </section>

      <section className="px-6 py-12 border-t border-border/30 bg-verity-surface">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <p className="text-muted-foreground">Verity</p>
          <div className="flex items-center gap-5">
            <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link to="/safety" className="text-muted-foreground hover:text-foreground transition-colors">
              Safety
            </Link>
            <Link to="/transparency" className="text-muted-foreground hover:text-foreground transition-colors">
              Transparency
            </Link>
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-3 md:hidden">
        <Link
          to="/auth?mode=signup"
          onClick={() => trackEvent("landing_primary_cta_clicked", { placement: "sticky_mobile" })}
          className="flex items-center justify-center gap-2 rounded-full bg-gradient-gold text-primary-foreground font-semibold py-3.5 shadow-lg"
        >
          Try a 45s Spark
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="pb-24 md:pb-0" />
      <AppNav />
    </div>
  );
};

export default Landing;
