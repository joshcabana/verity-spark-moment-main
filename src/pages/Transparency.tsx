import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, CheckCircle, AlertTriangle, BarChart3, Lock, TrendingUp, Users, Scale } from "lucide-react";
import AppNav from "@/components/AppNav";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface StatsData {
  violation_free_percentage: number;
  total_calls_last_month: number;
  average_moderation_latency_ms: number;
  tier0_count: number;
  tier1_count: number;
  appeals_success_rate: number;
  total_violations: number;
}

const safetyLayers = [
  {
    title: "Pre-Call Verification",
    items: [
      "Phone number verification",
      "AI liveness selfie check",
      "Optional government ID for trust tiers",
      "Behavioral risk scoring",
    ],
  },
  {
    title: "Live AI Moderation",
    items: [
      "Real-time nudity & harassment detection",
      "Aggressive tone & language analysis",
      "Deepfake & liveness verification",
      "Instant termination for violations",
    ],
  },
  {
    title: "In-Call Protection",
    items: [
      "Safe Exit button always available",
      "We don’t record calls. Screen-recording is against policy and enforceable via reports.",
      "Complete anonymity during call",
      "Subtle warnings for borderline behavior",
    ],
  },
  {
    title: "Post-Call Safety",
    items: [
      "Human review for all terminations (<5 min)",
      "Full appeals process with apology tokens",
      "30-day encrypted violation clip storage",
      "Zero-tolerance enforcement with bans",
    ],
  },
];

const Transparency = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadStats = async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/get_public_transparency_stats`,
        {
          method: 'POST',
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: '{}',
        }
      );
      if (response.ok) {
        const rows = await response.json();
        if (rows && rows.length > 0) {
          setStats(rows[0] as StatsData);
        }
      }
    };

    loadStats();
  }, []);

  const violationFreeRate = stats
    ? `${stats.violation_free_percentage}%`
    : "Pilot data pending";

  const safetyStatsDisplay = [
    {
      label: "Calls violation-free",
      value: violationFreeRate,
      icon: CheckCircle,
      live: !!stats,
    },
    {
      label: "Avg moderation latency",
      value: stats ? `${stats.average_moderation_latency_ms || "<100"}ms` : "<100ms",
      icon: BarChart3,
      live: !!stats,
    },
    {
      label: "Total violations caught",
      value: stats ? `${stats.total_violations}` : "0",
      icon: AlertTriangle,
      live: !!stats,
    },
    {
      label: "Appeals resolved in",
      value: "<5 min",
      icon: Lock,
      live: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background px-6 pt-8 pb-24">
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <Shield className="w-10 h-10 text-primary mx-auto mb-3" />
          <h1 className="font-display text-3xl font-bold text-foreground mb-1">
            Safety & Transparency
          </h1>
          <p className="text-muted-foreground text-sm">
            Verity is explicitly not Omegle. We are curated, protected, and intentional.
          </p>
        </motion.div>

        {/* Live stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {safetyStatsDisplay.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass-card rounded-xl p-4 text-center relative"
            >
              {stat.live && (
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-verity-success animate-pulse" />
                  <span className="text-[8px] text-verity-success">LIVE</span>
                </div>
              )}
              <stat.icon className="w-5 h-5 text-verity-success mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Safety Architecture */}
        <div className="space-y-4">
          {safetyLayers.map((layer, i) => (
            <motion.div
              key={layer.title}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="glass-card rounded-2xl p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {i + 1}
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {layer.title}
                </h3>
              </div>
              <ul className="space-y-2">
                {layer.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-foreground/80">
                    <CheckCircle className="w-4 h-4 text-verity-success shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Compliance */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 glass-card rounded-2xl p-5"
        >
          <h3 className="font-display text-lg font-semibold text-foreground mb-3">
            Regulatory Compliance
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>✓ Australian eSafety Commissioner — proactive prevention of image-based abuse & cyberflashing</p>
            <p>✓ UK Online Safety Act — proactive cyberflashing prevention</p>
            <p>✓ EU Digital Services Act — transparency reporting</p>
            <p>✓ GDPR & CCPA — data minimization, no full video storage</p>
            <p>✓ Quarterly bias audits for fairness</p>
          </div>

          <div className="mt-4 p-4 rounded-xl bg-secondary/50 border border-border/30">
            <p className="text-sm font-medium text-foreground mb-1">🇦🇺 Australian eSafety Commissioner</p>
            <p className="text-xs text-muted-foreground mb-2">
              If you experience online abuse or need to report harmful content, contact the eSafety Commissioner:
            </p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>🌐 <a href="https://www.esafety.gov.au" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.esafety.gov.au</a></p>
              <p>📧 <a href="mailto:enquiries@esafety.gov.au" className="text-primary hover:underline">enquiries@esafety.gov.au</a></p>
              <p>📞 <span className="text-foreground">1800 880 176</span> (free call)</p>
            </div>
          </div>
        </motion.div>

        {/* AI badge */}
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-4 h-4 text-verity-success" />
          Powered by Verity AI — Real-time moderation pipeline
        </div>
      </div>

      <AppNav />
    </div>
  );
};

export default Transparency;
