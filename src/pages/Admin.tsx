import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield, AlertTriangle, Ban, CheckCircle, Eye, Clock,
  ChevronDown, ChevronUp, Play, XCircle, Award, ArrowLeft,
  FileText, Users, BarChart3
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

type ModerationEvent = {
  id: string;
  created_at: string;
  category: string;
  tier: number;
  confidence: number;
  action_taken: string;
  ai_reasoning: string | null;
  reviewed: boolean;
  review_outcome: string | null;
  offender_id: string;
  victim_id: string | null;
  clip_url: string | null;
  clip_expires_at: string | null;
  match_id: string | null;
  offender_profile?: {
    display_name: string | null;
    verification_status: string;
    verified_phone: boolean;
  } | null;
};

type Appeal = {
  id: string;
  created_at: string;
  user_id: string;
  moderation_event_id: string;
  appeal_text: string | null;
  status: string;
  resolution_text: string | null;
  apology_tokens_awarded: number | null;
};

type Tab = "events" | "appeals" | "stats";

interface ModerationStatDay {
  date: string;
  total_calls: number;
  tier0_actions: number;
  tier1_warnings: number;
  avg_latency_ms: number;
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return "Action failed";
};

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("events");
  const [events, setEvents] = useState<ModerationEvent[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Check admin role
  useEffect(() => {
    if (!user) return;
    const checkAdmin = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin");

      if (data && data.length > 0) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [user]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-moderation?action=list`,
      {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      }
    );
    if (response.ok) {
      const result = await response.json();
      setEvents(result.events || []);
    }
    setLoading(false);
  }, []);

  const loadAppeals = useCallback(async () => {
    setLoading(true);
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-moderation?action=list-appeals`,
      {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      }
    );
    if (response.ok) {
      const result = await response.json();
      setAppeals(result.appeals || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === "events") loadEvents();
    else if (tab === "appeals") loadAppeals();
    else setLoading(false);
  }, [isAdmin, tab, loadEvents, loadAppeals]);

  const adminAction = async (action: string, body: Record<string, unknown>) => {
    const id = body.eventId || body.appealId || "";
    setActionLoading(id);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-moderation?action=${action}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify(body),
        }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Action failed");
      }
      toast({ title: "Action completed ✓" });
      if (tab === "events") loadEvents();
      else loadAppeals();
    } catch (error) {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const getClipUrl = async (path: string): Promise<string | null> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-moderation?action=get-clip&path=${encodeURIComponent(path)}`,
        {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (response.ok) {
        const result = await response.json();
        return result.url;
      }
    } catch {
      // ignore
    }
    return null;
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center">
          <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You need admin privileges to access this page.</p>
          <button onClick={() => navigate("/lobby")} className="text-primary font-medium hover:underline">
            Return to Lobby
          </button>
        </div>
      </div>
    );
  }

  const tierBadge = (tier: number) => {
    if (tier === 0) return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-destructive/20 text-destructive">T0</span>;
    if (tier === 1) return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 text-amber-400">T1</span>;
    return <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-muted text-muted-foreground">T2</span>;
  };

  const statusBadge = (event: ModerationEvent) => {
    if (event.reviewed) {
      return <span className="px-2 py-0.5 text-xs rounded-full bg-verity-success/20 text-verity-success">{event.review_outcome}</span>;
    }
    return <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400">Pending Review</span>;
  };

  return (
    <div className="min-h-screen bg-background px-6 pt-8 pb-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate("/lobby")} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold text-gradient-gold">Moderation Dashboard</h1>
            <p className="text-muted-foreground text-xs">Human review queue · Admin only</p>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {([
            { id: "events" as Tab, label: "Flagged Calls", icon: AlertTriangle },
            { id: "appeals" as Tab, label: "Appeals", icon: FileText },
            { id: "stats" as Tab, label: "Stats", icon: BarChart3 },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === t.id
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "glass-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Events Tab */}
            {tab === "events" && (
              <div className="space-y-3">
                {events.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No flagged events</p>
                  </div>
                ) : (
                  events.map((event) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="glass-card rounded-xl overflow-hidden"
                    >
                      <button
                        onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                        className="w-full p-4 flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-3">
                          {tierBadge(event.tier)}
                          <div>
                            <div className="text-sm font-medium text-foreground capitalize">
                              {event.category.replace(/_/g, " ")}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(event.created_at).toLocaleString()} · {Math.round(event.confidence * 100)}% confidence
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {statusBadge(event)}
                          {event.clip_url && <Play className="w-4 h-4 text-primary" />}
                          {expandedEvent === event.id ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {expandedEvent === event.id && (
                        <div className="border-t border-border px-4 pb-4 pt-3">
                          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Offender:</span>{" "}
                              <span className="text-foreground font-medium">
                                {event.offender_profile?.display_name || event.offender_id.slice(0, 8)}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Action:</span>{" "}
                              <span className="text-foreground capitalize">{event.action_taken}</span>
                            </div>
                          </div>

                          {event.ai_reasoning && (
                            <div className="bg-secondary/50 rounded-lg p-3 mb-4">
                              <div className="text-xs text-muted-foreground mb-1">AI Reasoning</div>
                              <p className="text-sm text-foreground">{event.ai_reasoning}</p>
                            </div>
                          )}

                          {event.clip_url && (
                            <button
                              onClick={async () => {
                                const url = await getClipUrl(event.clip_url!);
                                if (url) window.open(url, "_blank");
                                else toast({ title: "Failed to load clip", variant: "destructive" });
                              }}
                              className="flex items-center gap-2 text-sm text-primary hover:underline mb-4"
                            >
                              <Eye className="w-4 h-4" />
                              View Evidence Clip
                            </button>
                          )}

                          {!event.reviewed && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => adminAction("ban", {
                                  targetUserId: event.offender_id,
                                  reason: `Confirmed: ${event.category}`,
                                  banType: event.tier === 0 ? "permanent" : "temporary",
                                  durationDays: event.tier === 0 ? undefined : 7,
                                  eventId: event.id,
                                })}
                                disabled={actionLoading === event.id}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors disabled:opacity-50"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                Confirm Ban
                              </button>
                              <button
                                onClick={() => adminAction("dismiss", { eventId: event.id })}
                                disabled={actionLoading === event.id}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 transition-colors disabled:opacity-50"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Dismiss
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* Appeals Tab */}
            {tab === "appeals" && (
              <div className="space-y-3">
                {appeals.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No appeals submitted</p>
                  </div>
                ) : (
                  appeals.map((appeal) => (
                    <motion.div
                      key={appeal.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="glass-card rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {(() => {
                            const isPending = appeal.status === "pending" || appeal.status === "reviewing";
                            const isOverturned = appeal.status === "overturned";
                            const isUpheld = appeal.status === "upheld";
                            const statusClasses = isPending
                              ? "bg-amber-500/20 text-amber-400"
                              : isOverturned
                                ? "bg-verity-success/20 text-verity-success"
                                : isUpheld
                                  ? "bg-destructive/20 text-destructive"
                                  : "bg-muted text-muted-foreground";
                            return (
                              <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${statusClasses}`}>
                                {appeal.status}
                              </span>
                            );
                          })()}
                          <span className="text-xs text-muted-foreground">
                            {new Date(appeal.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {appeal.appeal_text && (
                        <p className="text-sm text-foreground mb-3 bg-secondary/50 rounded-lg p-3">
                          "{appeal.appeal_text}"
                        </p>
                      )}

                      {(appeal.status === "pending" || appeal.status === "reviewing") && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => adminAction("override-appeal", {
                              appealId: appeal.id,
                              outcome: "overturned",
                              tokensAwarded: 3,
                            })}
                            disabled={actionLoading === appeal.id}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-verity-success/10 text-verity-success text-sm font-medium hover:bg-verity-success/20 transition-colors disabled:opacity-50"
                          >
                            <Award className="w-3.5 h-3.5" />
                            Overturn + 3 Tokens
                          </button>
                          <button
                            onClick={() => adminAction("override-appeal", {
                              appealId: appeal.id,
                              outcome: "upheld",
                              tokensAwarded: 0,
                            })}
                            disabled={actionLoading === appeal.id}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors disabled:opacity-50"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Uphold
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* Stats Tab */}
            {tab === "stats" && <AdminStats />}
          </>
        )}
      </div>
    </div>
  );
};

const AdminStats = () => {
  const [stats, setStats] = useState<ModerationStatDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-moderation?action=stats`,
        {
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      if (response.ok) {
        const result = await response.json();
        setStats(result.stats || []);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const latest = stats[0];

  return (
    <div className="space-y-4">
      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Calls", value: latest.total_calls, icon: Users },
            { label: "Tier 0 Actions", value: latest.tier0_actions, icon: Ban },
            { label: "Tier 1 Warnings", value: latest.tier1_warnings, icon: AlertTriangle },
            { label: "Avg Latency", value: `${latest.avg_latency_ms}ms`, icon: Clock },
          ].map((stat) => (
            <div key={stat.label} className="glass-card rounded-xl p-4 text-center">
              <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
              <div className="text-lg font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="glass-card rounded-xl p-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Recent Days</h3>
        <div className="space-y-2">
          {stats.slice(0, 7).map((day) => (
            <div key={day.date} className="flex items-center justify-between text-sm py-2 border-b border-border/30 last:border-0">
              <span className="text-foreground">{day.date}</span>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>{day.total_calls} calls</span>
                <span className="text-destructive">{day.tier0_actions} T0</span>
                <span className="text-amber-400">{day.tier1_warnings} T1</span>
                <span>{day.avg_latency_ms}ms</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Admin;
