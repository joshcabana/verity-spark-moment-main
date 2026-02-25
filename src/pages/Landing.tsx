import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Shield, Clock, Eye, Users, Sparkles, Video } from "lucide-react";
import AppNav from "@/components/AppNav";
import { trackEvent } from "@/lib/analytics";

const stats = [
  { value: "78%", label: "of users burned out on dating apps" },
  { value: "45s", label: "is all you need for a real spark" },
  { value: "Pilot data pending", label: "for violation-free call rate" },
  { value: "0", label: "profiles. Zero swipes. Just you." },
];

const features = [
  {
    icon: Video,
    title: "45-Second Live Video",
    description: "Full-screen, face-to-face. No filters, no bios, no curated lies. Just raw human presence.",
  },
  {
    icon: Eye,
    title: "Complete Anonymity",
    description: "No names, no handles, no photos upfront. Only the live feed. Identity unlocks only on mutual match.",
  },
  {
    icon: Shield,
    title: "AI-Powered Safety",
    description: "Real-time moderation on every call. Zero-tolerance policy. Safe Exit button always active.",
  },
  {
    icon: Clock,
    title: "No Addiction By Design",
    description: "Daily limits, no infinite scrolling, no dopamine traps. Engaging, not addictive.",
  },
  {
    icon: Users,
    title: "Themed Rooms",
    description: "Night Owls, Tech Professionals, Creatives & Makers, Over 35, Introvert Hours. Find your people.",
  },
  {
    icon: Sparkles,
    title: "Spark Extension",
    description: "One free 90-second extension daily. Because sometimes 45 seconds isn't quite enough.",
  },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative min-h-screen h-[100dvh] flex items-center justify-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
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
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-black/70" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Logo */}
            <h1 className="font-display text-6xl md:text-8xl font-bold tracking-tight mb-2">
              <span className="text-gradient-gold">Verity</span>
            </h1>
            <p className="text-muted-foreground text-sm tracking-[0.3em] uppercase mb-10">
              The Anti-Dating-App Dating App
            </p>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-display text-2xl md:text-4xl text-foreground/90 leading-relaxed mb-6 italic"
          >
            "If there's no spark in 45 seconds of real eyes and voice,
            <br className="hidden md:block" />
            there won't be one after 45 swipes."
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-muted-foreground text-lg md:text-xl mb-12 max-w-2xl mx-auto"
          >
            No profiles. No swiping. No bios. Just 45 seconds of anonymous live video — 
            and whether it sparks.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              to="/auth?mode=signup"
              onClick={() => trackEvent("landing_primary_cta_clicked", { placement: "hero" })}
              className="group relative inline-flex items-center gap-3 bg-gradient-gold text-primary-foreground font-semibold text-lg px-10 py-4 rounded-full glow-gold transition-all hover:scale-105"
            >
              Go Live
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/transparency"
              onClick={() => trackEvent("landing_safety_clicked")}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors px-6 py-4"
            >
              <Shield className="w-4 h-4" />
              How we keep you safe
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-6">
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
              <div className="text-3xl md:text-4xl font-bold text-gradient-gold mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
            How <span className="text-gradient-gold">Verity</span> Works
          </h2>
          <p className="text-muted-foreground text-lg">
            Three steps. No games. Real connection.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-0">
          {[
            { step: "01", title: "Tap Go Live", desc: "No browsing. No swiping. No searching. Just tap — and you're instantly matched with someone who's ready too." },
            { step: "02", title: "45 Seconds Face-to-Face", desc: "Full-screen, anonymous live video. No names, no bios. Just you, them, and a ticking clock. Be yourself." },
            { step: "03", title: "Match or Pass", desc: "Both decide privately. Only mutual sparks unlock identities and chat. No rejection notifications. No ego damage." },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="flex items-start gap-6 py-10 border-b border-border/30 last:border-0"
            >
              <span className="text-5xl font-display font-bold text-verity-gold-dim shrink-0">
                {item.step}
              </span>
              <div>
                <h3 className="font-display text-2xl font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-verity-surface">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
              Built Different
            </h2>
            <p className="text-muted-foreground text-lg">
              Every feature designed to fix what's broken in modern dating.
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
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center">
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
            45 seconds. Real eyes. Real spark. Because real connection doesn't need a bio.
          </p>
          <Link
            to="/auth?mode=signup"
            onClick={() => trackEvent("landing_primary_cta_clicked", { placement: "footer" })}
            className="group inline-flex items-center gap-3 bg-gradient-gold text-primary-foreground font-semibold text-lg px-12 py-5 rounded-full glow-gold transition-all hover:scale-105"
          >
            Go Live Now
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </section>

      <div className="pb-20" />
      <AppNav />
    </div>
  );
};

export default Landing;
