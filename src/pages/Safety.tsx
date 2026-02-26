import { motion } from "framer-motion";
import { Shield, Siren, Eye, Lock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import AppNav from "@/components/AppNav";

const safetyLayers = [
  {
    icon: Shield,
    title: "Pre-call controls",
    items: [
      "Phone verification and anti-abuse checks",
      "Policy acceptance before first call",
      "18+ access requirement",
    ],
  },
  {
    icon: Eye,
    title: "Live moderation",
    items: [
      "AI safety monitoring during calls",
      "Fast intervention on severe violations",
      "Escalation path for repeated abuse",
    ],
  },
  {
    icon: Siren,
    title: "In-call protection",
    items: [
      "Safe Exit available at all times",
      "Instant report flow after unsafe interaction",
      "Anonymous identity before mutual match",
    ],
  },
  {
    icon: Lock,
    title: "Post-call enforcement",
    items: [
      "Review pipeline for reports and appeals",
      "Warnings, suspensions, and bans",
      "Platform-level repeat offender prevention",
    ],
  },
];

const Safety = () => {
  return (
    <div className="min-h-screen bg-background px-6 pt-10 pb-28">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <Shield className="w-10 h-10 text-primary mx-auto mb-3" />
          <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-3">
            Safety by Design
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Verity is built for real connection with clear boundaries: anonymous start, active moderation,
            and rapid enforcement against abusive behavior.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-5">
          {safetyLayers.map((layer, idx) => (
            <motion.div
              key={layer.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="rounded-2xl border border-border/50 bg-verity-surface/60 p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <layer.icon className="w-5 h-5 text-primary" />
                <h2 className="font-display text-xl text-foreground font-semibold">{layer.title}</h2>
              </div>
              <ul className="space-y-2">
                {layer.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-verity-success mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 rounded-2xl border border-border/50 bg-verity-surface/60 p-5"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Need help?</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            If you experience online abuse or feel unsafe, use Safe Exit and report in-app immediately.
            For Australian support services, visit the eSafety Commissioner.
          </p>
          <a
            href="https://www.esafety.gov.au"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 text-sm text-primary hover:underline"
          >
            Visit eSafety.gov.au
          </a>
        </motion.div>

        <div className="mt-10 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Back to landing
          </Link>
        </div>
      </div>

      <AppNav />
    </div>
  );
};

export default Safety;
