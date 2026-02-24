import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, Clock, CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import AppNav from "@/components/AppNav";

interface ModerationEvent {
  id: string;
  tier: number;
  category: string;
  confidence: number;
  action_taken: string;
  ai_reasoning: string | null;
  created_at: string;
  reviewed: boolean;
  review_outcome: string | null;
}

interface Appeal {
  id: string;
  moderation_event_id: string;
  status: string;
  appeal_text: string | null;
  resolution_text: string | null;
  apology_tokens_awarded: number;
  created_at: string;
  resolved_at: string | null;
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return "Could not submit appeal";
};

const AppealPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<ModerationEvent[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [appealText, setAppealText] = useState("");
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [eventsRes, appealsRes] = await Promise.all([
        supabase.from("moderation_events").select("*").eq("offender_id", user.id).order("created_at", { ascending: false }),
        supabase.from("appeals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      setEvents((eventsRes.data as ModerationEvent[]) || []);
      setAppeals((appealsRes.data as Appeal[]) || []);
      setLoading(false);
    };
    load();
  }, [user]);

  const handleAppeal = async (eventId: string) => {
    setSubmitting(eventId);
    try {
      const { data, error } = await supabase.functions.invoke("submit-appeal", {
        body: { moderationEventId: eventId, appealText },
      });
      if (error) throw error;
      toast({
        title: data?.status === "overturned" ? "Appeal Overturned! 🎉" : "Appeal Submitted",
        description: data?.message,
      });
      // Refresh
      const [eventsRes, appealsRes] = await Promise.all([
        supabase.from("moderation_events").select("*").eq("offender_id", user!.id).order("created_at", { ascending: false }),
        supabase.from("appeals").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
      ]);
      setEvents((eventsRes.data as ModerationEvent[]) || []);
      setAppeals((appealsRes.data as Appeal[]) || []);
      setAppealText("");
    } catch (error) {
      toast({ title: "Error", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setSubmitting(null);
    }
  };

  const hasAppeal = (eventId: string) => appeals.some((a) => a.moderation_event_id === eventId);
  const getAppeal = (eventId: string) => appeals.find((a) => a.moderation_event_id === eventId);

  const tierLabel = (tier: number) => {
    if (tier === 0) return "Severe Violation";
    if (tier === 1) return "Warning";
    return "Logged";
  };

  const tierColor = (tier: number) => {
    if (tier === 0) return "text-destructive";
    if (tier === 1) return "text-amber-400";
    return "text-muted-foreground";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 pt-8 pb-24">
      <div className="max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold text-gradient-gold">Appeals</h1>
            <p className="text-muted-foreground text-xs">Review and appeal moderation actions</p>
          </div>
        </motion.div>

        {events.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <Shield className="w-12 h-12 text-verity-success mx-auto mb-4" />
            <h2 className="font-display text-xl font-semibold text-foreground mb-2">All Clear</h2>
            <p className="text-muted-foreground text-sm">No moderation actions on your account.</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {events.map((event, i) => {
              const appeal = getAppeal(event.id);
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card rounded-2xl p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-4 h-4 ${tierColor(event.tier)}`} />
                      <span className={`text-sm font-medium ${tierColor(event.tier)}`}>{tierLabel(event.tier)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="mb-3">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">Category</span>
                    <p className="text-sm text-foreground capitalize">{event.category.replace("_", " ")}</p>
                  </div>

                  {event.ai_reasoning && (
                    <div className="mb-3">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">AI Reasoning</span>
                      <p className="text-sm text-foreground/80">{event.ai_reasoning}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    <span>Confidence: {Math.round(Number(event.confidence) * 100)}%</span>
                    <span>Action: {event.action_taken}</span>
                  </div>

                  {/* Appeal status */}
                  {appeal ? (
                    <div className={`rounded-xl p-3 ${
                      appeal.status === "overturned"
                        ? "bg-verity-success/10 border border-verity-success/20"
                        : appeal.status === "upheld"
                          ? "bg-destructive/10 border border-destructive/20"
                          : "bg-primary/10 border border-primary/20"
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        {appeal.status === "overturned" ? (
                          <CheckCircle className="w-4 h-4 text-verity-success" />
                        ) : appeal.status === "upheld" ? (
                          <XCircle className="w-4 h-4 text-destructive" />
                        ) : appeal.status === "reviewing" ? (
                          <Clock className="w-4 h-4 text-primary" />
                        ) : (
                          <Clock className="w-4 h-4 text-primary" />
                        )}
                        <span className="text-sm font-medium text-foreground capitalize">{appeal.status}</span>
                      </div>
                      {appeal.resolution_text && (
                        <p className="text-xs text-foreground/70">{appeal.resolution_text}</p>
                      )}
                      {appeal.apology_tokens_awarded > 0 && (
                        <p className="text-xs text-verity-success mt-1">+{appeal.apology_tokens_awarded} apology tokens awarded</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <textarea
                        value={submitting === event.id ? appealText : ""}
                        onChange={(e) => { setAppealText(e.target.value); setSubmitting(event.id); }}
                        onFocus={() => setSubmitting(event.id)}
                        placeholder="Explain why you believe this was a mistake (optional)..."
                        className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none h-16 focus:outline-none focus:border-primary/50 mb-2"
                      />
                      <button
                        onClick={() => handleAppeal(event.id)}
                        disabled={submitting === event.id && appealText === ""}
                        className="w-full bg-primary/10 text-primary border border-primary/20 font-medium py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-primary/20 transition-colors"
                      >
                        {submitting === event.id ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Submitting...</>
                        ) : (
                          "Submit Appeal"
                        )}
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      <AppNav />
    </div>
  );
};

export default AppealPage;
