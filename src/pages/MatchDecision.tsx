import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, X, Sparkles, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface DecisionResponse {
  awaitingOther?: boolean;
  isMutual?: boolean | null;
}

interface MatchUpdateRow {
  id: string;
  user1_decision: "spark" | "pass" | null;
  user2_decision: "spark" | "pass" | null;
  is_mutual: boolean | null;
}

const toDecisionResponse = (value: unknown): DecisionResponse => {
  if (!value || typeof value !== "object") return {};
  return value as DecisionResponse;
};

const MatchDecision = () => {
  const [decision, setDecision] = useState<"spark" | "pass" | null>(null);
  const [showReaction, setShowReaction] = useState(false);
  const [reactionNote, setReactionNote] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [matchResult, setMatchResult] = useState<"mutual" | "no-match" | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const navTimerRef = useRef<number | null>(null);
  const showResultRef = useRef(false);

  useEffect(() => {
    showResultRef.current = showResult;
  }, [showResult]);

  const clearTimersAndChannel = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (navTimerRef.current !== null) {
      window.clearTimeout(navTimerRef.current);
      navTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem("verity_match");
    if (!raw) {
      toast({ title: "Match session missing", description: "Starting a new session.", variant: "destructive" });
      navigate("/lobby");
      return;
    }

    const parsed = JSON.parse(raw) as { matchId?: string };
    if (!parsed.matchId) {
      toast({ title: "Match session invalid", description: "Please reconnect from lobby.", variant: "destructive" });
      navigate("/lobby");
      return;
    }

    setMatchId(parsed.matchId);
  }, [navigate]);

  useEffect(() => {
    return () => clearTimersAndChannel();
  }, [clearTimersAndChannel]);

  const submitDecision = async (choice: "spark" | "pass", note?: string): Promise<boolean> => {
    if (!user || !matchId) return false;

    const { data, error } = await supabase.rpc("rpc_submit_match_decision", {
      p_match_id: matchId,
      p_decision: choice,
      p_note: note ?? null,
    });

    if (error) {
      toast({ title: "Decision failed", description: error.message, variant: "destructive" });
      return false;
    }

    const result = toDecisionResponse(data);
    if (!result.awaitingOther) {
      setMatchResult(result.isMutual ? "mutual" : "no-match");
      setShowResult(true);
      return true;
    }

    channelRef.current = supabase
      .channel(`match-decision-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          const updated = payload.new as MatchUpdateRow;
          if (updated.user1_decision && updated.user2_decision) {
            clearTimersAndChannel();
            setMatchResult(updated.is_mutual ? "mutual" : "no-match");
            setShowResult(true);
          }
        },
      )
      .subscribe();

    timeoutRef.current = window.setTimeout(() => {
      clearTimersAndChannel();
      if (!showResultRef.current) {
        navigate("/lobby");
      }
    }, 30000);
    return true;
  };

  const handleDecision = (choice: "spark" | "pass") => {
    setDecision(choice);

    if (choice === "spark") {
      setShowReaction(true);
      return;
    }

    void (async () => {
      const success = await submitDecision("pass");
      if (!success) {
        setDecision(null);
        return;
      }
      setShowResult(true);
      setMatchResult("no-match");
      if (navTimerRef.current !== null) {
        window.clearTimeout(navTimerRef.current);
      }
      navTimerRef.current = window.setTimeout(() => navigate("/lobby"), 1500);
    })();
  };

  const handleSendReaction = () => {
    setShowReaction(false);
    void submitDecision("spark", reactionNote || undefined);
  };

  useEffect(() => {
    if (!showResult) return;
    if (navTimerRef.current !== null) {
      window.clearTimeout(navTimerRef.current);
    }

    if (matchResult === "mutual" && matchId) {
      navTimerRef.current = window.setTimeout(() => navigate(`/chat/${matchId}`), 3000);
      return;
    }

    if (matchResult === "no-match") {
      navTimerRef.current = window.setTimeout(() => navigate("/lobby"), 2000);
    }
  }, [showResult, matchResult, matchId, navigate]);

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center px-6">
      <AnimatePresence mode="wait">
        {!decision && (
          <motion.div
            key="decision"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center max-w-sm w-full"
          >
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Sparkles className="w-10 h-10 text-primary mx-auto mb-4" />
              <h2 className="font-display text-3xl font-bold text-foreground mb-2">Time&apos;s Up</h2>
              <p className="text-muted-foreground mb-10">Did you feel a spark? Your decision is completely private.</p>
            </motion.div>

            <div className="flex items-center justify-center gap-8">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleDecision("pass")}
                className="w-20 h-20 rounded-full bg-secondary border border-border flex items-center justify-center transition-colors hover:bg-destructive/10 hover:border-destructive/30"
              >
                <X className="w-8 h-8 text-muted-foreground" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleDecision("spark")}
                className="w-24 h-24 rounded-full bg-gradient-gold glow-gold flex items-center justify-center"
              >
                <Heart className="w-10 h-10 text-primary-foreground" />
              </motion.button>
            </div>

            <div className="flex items-center justify-center gap-8 mt-4">
              <span className="text-sm text-muted-foreground w-20">Pass</span>
              <span className="text-sm text-primary font-medium w-24">Spark!</span>
            </div>
          </motion.div>
        )}

        {showReaction && (
          <motion.div
            key="reaction"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center max-w-sm w-full"
          >
            <Heart className="w-10 h-10 text-primary mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">Send a Reaction Note</h2>
            <p className="text-muted-foreground text-sm mb-6">10 seconds — leave a quick note they&apos;ll only see if it&apos;s mutual.</p>

            <div className="relative mb-4">
              <textarea
                value={reactionNote}
                onChange={(event) => setReactionNote(event.target.value)}
                placeholder="Your laugh was infectious..."
                maxLength={100}
                className="w-full bg-secondary border border-border rounded-xl p-4 text-foreground placeholder:text-muted-foreground/50 resize-none h-24 text-sm focus:outline-none focus:border-primary/50"
              />
              <span className="absolute bottom-3 right-3 text-xs text-muted-foreground">{reactionNote.length}/100</span>
            </div>

            <button
              onClick={handleSendReaction}
              className="w-full bg-gradient-gold text-primary-foreground font-semibold py-4 rounded-full glow-gold flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send Note
            </button>

            <button onClick={handleSendReaction} className="mt-3 text-muted-foreground text-sm hover:text-foreground transition-colors">
              Skip note
            </button>
          </motion.div>
        )}

        {showResult && matchResult === "mutual" && (
          <motion.div key="result" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
              className="w-24 h-24 rounded-full bg-gradient-gold glow-gold flex items-center justify-center mx-auto mb-6"
            >
              <Sparkles className="w-12 h-12 text-primary-foreground" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="font-display text-4xl font-bold text-gradient-gold mb-3"
            >
              It&apos;s a Spark!
            </motion.h2>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="text-muted-foreground">
              You both felt it. Chat is now unlocked.
            </motion.p>
          </motion.div>
        )}

        {((decision === "pass") || (showResult && matchResult === "no-match")) && (
          <motion.div key="passed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <p className="text-muted-foreground text-lg">No worries. Your next spark awaits.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MatchDecision;
