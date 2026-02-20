import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, MessageCircle, Clock, Sparkles, Lock, Users, CheckCircle } from "lucide-react";
import AppNav from "@/components/AppNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SparkMatch {
  id: string;
  room_id: string;
  created_at: string;
  user1_note: string | null;
  user2_note: string | null;
  user1_id: string;
  user2_id: string;
}

const SparkHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sparks, setSparks] = useState<SparkMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("matches")
        .select("*")
        .eq("is_mutual", true)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      setSparks((data as SparkMatch[]) || []);
      setLoading(false);
    };
    load();
  }, [user]);

  const getNote = (spark: SparkMatch) => {
    if (!user) return null;
    // Show the other person's note to you
    return spark.user1_id === user.id ? spark.user2_note : spark.user1_note;
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return `Today, ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
    if (diff < 172800000) return "Yesterday";
    return d.toLocaleDateString();
  };

  const roomNames: Record<string, string> = {
    general: "Open Room", "night-owls": "Night Owls", tech: "Tech Professionals",
    creatives: "Creatives & Makers", "over-35": "Over 35", introverts: "Introvert Hours",
  };

  return (
    <div className="min-h-screen bg-background px-6 pt-8 pb-24">
      <div className="max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="font-display text-3xl font-bold text-gradient-gold mb-1">Spark History</h1>
          <p className="text-muted-foreground text-sm">Your mutual connections. Only sparks show here.</p>
        </motion.div>

        {/* Verity Circle */}
        {sparks.length >= 3 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl p-4 mb-6 border-verity-success/30 glow-gold-sm relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-verity-success/10 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-verity-success" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-foreground">Verity Circle</div>
                    <CheckCircle className="w-3.5 h-3.5 text-verity-success" />
                  </div>
                  <div className="text-xs text-verity-success font-medium">Unlocked! {sparks.length} mutual sparks</div>
                </div>
              </div>
              <div className="bg-verity-success/5 border border-verity-success/15 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-verity-success shrink-0" />
                  <span className="text-sm font-medium text-foreground">Group video rooms — coming soon</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  You've earned access to Verity Circle. Group calls with your mutual connections will be available in the next update.
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl p-4 mb-6 flex items-center gap-3 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 relative z-10">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 relative z-10">
              <div className="text-sm font-medium text-foreground">Verity Circle</div>
              <div className="text-xs text-muted-foreground">3+ mutual matches unlocks group video rooms</div>
            </div>
            <div className="flex items-center gap-1 text-primary text-xs font-medium relative z-10">
              <Lock className="w-3 h-3" />
              {sparks.length}/3
            </div>
          </motion.div>
        )}

        {/* Sparks list */}
        <div className="space-y-3">
          {sparks.map((spark, i) => {
            const note = getNote(spark);
            return (
              <motion.div
                key={spark.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card rounded-2xl p-4 hover:border-primary/20 transition-all cursor-pointer relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center">
                        <Flame className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">Mutual Spark</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(spark.created_at)}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-1 rounded-full">
                      {roomNames[spark.room_id] || spark.room_id}
                    </span>
                  </div>

                  {note && (
                    <div className="bg-secondary/50 rounded-lg p-3 mt-2 text-sm text-foreground/80 italic">
                      "{note}"
                    </div>
                  )}

                  <button
                    onClick={() => navigate(`/chat/${spark.id}`)}
                    className="mt-3 w-full flex items-center justify-center gap-2 text-primary text-sm font-medium py-2 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Open Chat
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {!loading && sparks.length === 0 && (
          <div className="text-center py-16">
            <Flame className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No sparks yet. Go Live to start connecting.</p>
          </div>
        )}

        {loading && (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}
      </div>

      <AppNav />
    </div>
  );
};

export default SparkHistory;
