import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart3,
  Flame,
  TrendingUp,
  Clock,
  Heart,
  Crown,
  ArrowLeft,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import AppNav from "@/components/AppNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface AnalyticsData {
  totalCalls: number;
  totalSparks: number;
  sparkRate: number;
  sparksReceived: number;
  sparksSent: number;
  mutualSparks: number;
  favoriteRoom: string;
  roomBreakdown: Record<string, number>;
  weeklyActivity: number[];
  streakDays: number;
}

const roomNames: Record<string, string> = {
  general: "Open Room",
  "night-owls": "Night Owls",
  tech: "Tech Professionals",
  creatives: "Creatives & Makers",
  "over-35": "Over 35",
  introverts: "Introvert Hours",
};

const SparkAnalytics = () => {
  const { user, subscribed } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      // Fetch all matches where user participated
      const { data: matches } = await supabase
        .from("matches")
        .select("*")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (!matches) {
        setLoading(false);
        return;
      }

      const totalCalls = matches.length;
      let sparksSent = 0;
      let sparksReceived = 0;
      let mutualSparks = 0;
      const roomCounts: Record<string, number> = {};

      // Weekly activity for last 7 days
      const weeklyActivity = new Array(7).fill(0);
      const now = new Date();

      // Streak calculation
      const matchDates = new Set<string>();

      for (const match of matches) {
        const isUser1 = match.user1_id === user.id;
        const myDecision = isUser1 ? match.user1_decision : match.user2_decision;
        const theirDecision = isUser1 ? match.user2_decision : match.user1_decision;

        if (myDecision === "spark") sparksSent++;
        if (theirDecision === "spark") sparksReceived++;
        if (match.is_mutual) mutualSparks++;

        // Room breakdown
        const room = match.room_id || "general";
        roomCounts[room] = (roomCounts[room] || 0) + 1;

        // Weekly activity
        const matchDate = new Date(match.created_at);
        const dayDiff = Math.floor((now.getTime() - matchDate.getTime()) / 86400000);
        if (dayDiff < 7) {
          weeklyActivity[6 - dayDiff]++;
        }

        // Streak dates
        matchDates.add(matchDate.toISOString().slice(0, 10));
      }

      // Calculate streak
      let streakDays = 0;
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const dateStr = checkDate.toISOString().slice(0, 10);
        if (matchDates.has(dateStr)) {
          streakDays++;
        } else if (i > 0) {
          break;
        }
      }

      // Find favorite room
      let favoriteRoom = "general";
      let maxRoomCount = 0;
      for (const [room, count] of Object.entries(roomCounts)) {
        if (count > maxRoomCount) {
          maxRoomCount = count;
          favoriteRoom = room;
        }
      }

      const sparkRate = totalCalls > 0 ? Math.round((mutualSparks / totalCalls) * 100) : 0;

      setAnalytics({
        totalCalls,
        totalSparks: sparksSent,
        sparkRate,
        sparksReceived,
        sparksSent,
        mutualSparks,
        favoriteRoom,
        roomBreakdown: roomCounts,
        weeklyActivity,
        streakDays,
      });
      setLoading(false);
    };

    load();
  }, [user]);

  if (!subscribed) {
    return (
      <div className="min-h-screen bg-background px-6 pt-8 pb-24">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mb-8"
          >
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div>
              <h1 className="font-display text-2xl font-bold text-gradient-gold">
                Spark Analytics
              </h1>
              <p className="text-muted-foreground text-xs">Verity Pass feature</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl p-8 text-center"
          >
            <Crown className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold text-foreground mb-2">
              Unlock Spark Analytics
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              See your connection patterns, spark rate, room insights, and activity streaks
              with a Verity Pass subscription.
            </p>
            <button
              onClick={() => navigate("/tokens")}
              className="bg-gradient-gold text-primary-foreground font-semibold py-3 px-8 rounded-full glow-gold"
            >
              Get Verity Pass
            </button>
          </motion.div>
        </div>
        <AppNav />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const data = analytics || {
    totalCalls: 0,
    totalSparks: 0,
    sparkRate: 0,
    sparksReceived: 0,
    sparksSent: 0,
    mutualSparks: 0,
    favoriteRoom: "general",
    roomBreakdown: {},
    weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
    streakDays: 0,
  };

  const maxWeekly = Math.max(...data.weeklyActivity, 1);
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Calculate which day of the week each bar represents
  const today = new Date().getDay(); // 0=Sun, 1=Mon, ...
  const getWeekdayLabel = (idx: number) => {
    const daysAgo = 6 - idx;
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return dayLabels[d.getDay() === 0 ? 6 : d.getDay() - 1];
  };

  return (
    <div className="min-h-screen bg-background px-6 pt-8 pb-24">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-8"
        >
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold text-gradient-gold">
              Spark Analytics
            </h1>
            <p className="text-muted-foreground text-xs">Your connection insights</p>
          </div>
        </motion.div>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            {
              label: "Total Calls",
              value: data.totalCalls,
              icon: Zap,
              color: "text-primary",
            },
            {
              label: "Mutual Sparks",
              value: data.mutualSparks,
              icon: Flame,
              color: "text-verity-gold",
            },
            {
              label: "Spark Rate",
              value: `${data.sparkRate}%`,
              icon: TrendingUp,
              color: "text-verity-success",
            },
            {
              label: "Day Streak",
              value: data.streakDays,
              icon: Sparkles,
              color: "text-amber-400",
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass-card rounded-xl p-4 text-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
              <div className="relative z-10">
                <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-2`} />
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Spark Breakdown */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl p-5 mb-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">Spark Breakdown</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Sparks you sent</span>
                <span className="text-sm font-medium text-foreground">{data.sparksSent}</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary rounded-full h-2 transition-all"
                  style={{
                    width: `${data.totalCalls > 0 ? (data.sparksSent / data.totalCalls) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Sparks received</span>
                <span className="text-sm font-medium text-foreground">
                  {data.sparksReceived}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-verity-success rounded-full h-2 transition-all"
                  style={{
                    width: `${data.totalCalls > 0 ? (data.sparksReceived / data.totalCalls) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Weekly Activity */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-2xl p-5 mb-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">Last 7 Days</h3>
            </div>
            <div className="flex items-end justify-between gap-2 h-24">
              {data.weeklyActivity.map((count, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-md bg-primary/20 relative overflow-hidden transition-all"
                    style={{ height: `${(count / maxWeekly) * 100}%`, minHeight: count > 0 ? 8 : 2 }}
                  >
                    <div
                      className="absolute inset-0 bg-gradient-gold rounded-t-md"
                      style={{ opacity: count > 0 ? 1 : 0 }}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground">
                    {getWeekdayLabel(i)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Room Insights */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="glass-card rounded-2xl p-5 mb-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">Room Insights</h3>
            </div>
            {data.favoriteRoom && (
              <div className="bg-primary/5 border border-primary/15 rounded-xl p-3 mb-3">
                <div className="text-xs text-muted-foreground mb-0.5">Favorite Room</div>
                <div className="text-sm font-medium text-foreground">
                  {roomNames[data.favoriteRoom] || data.favoriteRoom}
                </div>
              </div>
            )}
            <div className="space-y-2">
              {Object.entries(data.roomBreakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([room, count]) => {
                  const pct =
                    data.totalCalls > 0
                      ? Math.round((count / data.totalCalls) * 100)
                      : 0;
                  return (
                    <div key={room} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-28 truncate">
                        {roomNames[room] || room}
                      </span>
                      <div className="flex-1 bg-secondary rounded-full h-1.5">
                        <div
                          className="bg-primary/60 rounded-full h-1.5 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-foreground font-medium w-6 text-right">
                        {count}
                      </span>
                    </div>
                  );
                })}
            </div>
            {Object.keys(data.roomBreakdown).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No room data yet. Go Live to start!
              </p>
            )}
          </div>
        </motion.div>

        {/* Tip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-xs text-muted-foreground"
        >
          <Clock className="w-3.5 h-3.5 inline mr-1" />
          Analytics update after each call
        </motion.div>
      </div>

      <AppNav />
    </div>
  );
};

export default SparkAnalytics;
