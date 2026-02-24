import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Crown,
  Loader2,
  MessageCircle,
  Repeat2,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  UserRoundSearch,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { getPilotMetadata, trackEvent, trackPilotEvent } from "@/lib/analytics";
import {
  PostSparkFeedbackSchema,
  type SparkOutcome,
  getIcebreakersForMatch,
} from "@/lib/post-spark";
import { writeMatchSession } from "@/lib/match-session";

type MatchRow = Tables<"matches">;

interface PostSparkData {
  match: MatchRow;
  otherUserId: string;
  isFirstSpark: boolean;
  profile: {
    displayName: string | null;
    bio: string | null;
    avatarEmoji: string | null;
  } | null;
}

interface SparkAgainResponse {
  awaitingOther?: boolean;
  rematchMatchId?: string | null;
  roomId?: string | null;
  otherUserId?: string | null;
  charged?: boolean;
}

interface RevealIdentityResponse {
  revealed?: boolean;
  awaitingOther?: boolean;
}

const toSparkAgainResponse = (value: unknown): SparkAgainResponse => {
  if (!value || typeof value !== "object") return {};
  return value as SparkAgainResponse;
};

const toRevealIdentityResponse = (value: unknown): RevealIdentityResponse => {
  if (!value || typeof value !== "object") return {};
  return value as RevealIdentityResponse;
};

const PostSparkScreen = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, subscribed } = useAuth();
  const pilotMetadata = useMemo(() => getPilotMetadata(user?.user_metadata), [user?.user_metadata]);

  const [rating, setRating] = useState<"up" | "down">("up");
  const [note, setNote] = useState("");
  const [selectedIcebreaker, setSelectedIcebreaker] = useState<string>("");
  const [showCelebration, setShowCelebration] = useState(false);

  const viewedTrackedRef = useRef(false);
  const rematchNavigatedRef = useRef(false);

  const icebreakers = useMemo(
    () => getIcebreakersForMatch(matchId ?? "fallback-match-id", 4),
    [matchId],
  );

  useEffect(() => {
    if (!matchId) {
      toast({ title: "Match missing", description: "Returning to your sparks.", variant: "destructive" });
      navigate("/sparks");
    }
  }, [matchId, navigate]);

  useEffect(() => {
    if (!selectedIcebreaker && icebreakers.length > 0) {
      setSelectedIcebreaker(icebreakers[0].text);
    }
  }, [icebreakers, selectedIcebreaker]);

  const postSparkQuery = useQuery({
    queryKey: ["post-spark", matchId, user?.id],
    enabled: Boolean(matchId && user),
    queryFn: async (): Promise<PostSparkData> => {
      const { data: match, error: matchError } = await supabase
        .from("matches")
        .select(
          [
            "id",
            "user1_id",
            "user2_id",
            "room_id",
            "is_mutual",
            "identity_revealed_at",
            "user1_reveal_requested_at",
            "user2_reveal_requested_at",
            "user1_spark_again_requested_at",
            "user2_spark_again_requested_at",
            "rematch_match_id",
            "spark_outcome",
          ].join(","),
        )
        .eq("id", matchId!)
        .single();

      if (matchError || !match) {
        throw new Error(matchError?.message ?? "Could not load match.");
      }

      if (!user || (match.user1_id !== user.id && match.user2_id !== user.id)) {
        throw new Error("You do not have access to this spark.");
      }

      if (!match.is_mutual) {
        throw new Error("This experience is only available for mutual sparks.");
      }

      const otherUserId = match.user1_id === user.id ? match.user2_id : match.user1_id;

      const { count } = await supabase
        .from("matches")
        .select("id", { count: "exact", head: true })
        .eq("is_mutual", true)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      let profile: PostSparkData["profile"] = null;
      if (match.identity_revealed_at) {
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("display_name,bio,avatar_emoji")
          .eq("user_id", otherUserId)
          .maybeSingle();

        profile = profileRow
          ? {
              displayName: profileRow.display_name,
              bio: profileRow.bio,
              avatarEmoji: profileRow.avatar_emoji,
            }
          : null;
      }

      return {
        match,
        otherUserId,
        isFirstSpark: (count ?? 0) <= 1,
        profile,
      };
    },
  });

  useEffect(() => {
    if (!postSparkQuery.data || viewedTrackedRef.current || !matchId) return;
    viewedTrackedRef.current = true;
    setShowCelebration(postSparkQuery.data.isFirstSpark);

    trackPilotEvent("post_spark_viewed", {
      ...pilotMetadata,
      matchId,
      firstTimeSpark: postSparkQuery.data.isFirstSpark,
    });
  }, [postSparkQuery.data, matchId, pilotMetadata]);

  useEffect(() => {
    if (!showCelebration) return;
    const timer = window.setTimeout(() => setShowCelebration(false), 3500);
    return () => window.clearTimeout(timer);
  }, [showCelebration]);

  useEffect(() => {
    if (!matchId) return;

    const channel = supabase
      .channel(`post-spark-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `id=eq.${matchId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["post-spark", matchId, user?.id] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, queryClient, user?.id]);

  useEffect(() => {
    if (!user || !postSparkQuery.data || rematchNavigatedRef.current) return;
    const { match, otherUserId } = postSparkQuery.data;
    const userRequested =
      match.user1_id === user.id
        ? Boolean(match.user1_spark_again_requested_at)
        : Boolean(match.user2_spark_again_requested_at);

    if (!userRequested || !match.rematch_match_id) return;

    rematchNavigatedRef.current = true;
    writeMatchSession({
      matchId: match.rematch_match_id,
      queueId: match.rematch_match_id,
      matchedWith: otherUserId,
      roomId: match.room_id,
    });
    navigate("/call");
  }, [postSparkQuery.data, navigate, user]);

  const feedbackMutation = useMutation({
    mutationFn: async (payload: { sparkOutcome: SparkOutcome; rating: "up" | "down" }) => {
      if (!matchId) throw new Error("Match not found.");

      const parsed = PostSparkFeedbackSchema.safeParse({
        rating: payload.rating,
        note,
        sparkOutcome: payload.sparkOutcome,
      });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Invalid feedback.");
      }

      const { data, error } = await supabase.rpc("rpc_submit_post_spark_feedback", {
        p_match_id: matchId,
        p_rating: parsed.data.rating,
        p_note: parsed.data.note ?? null,
        p_spark_outcome: parsed.data.sparkOutcome,
      });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const sparkAgainMutation = useMutation({
    mutationFn: async () => {
      if (!matchId) throw new Error("Match not found.");
      const { data, error } = await supabase.rpc("rpc_request_spark_again", {
        p_match_id: matchId,
      });
      if (error) throw new Error(error.message);
      return toSparkAgainResponse(data);
    },
  });

  const revealMutation = useMutation({
    mutationFn: async () => {
      if (!matchId) throw new Error("Match not found.");
      const { data, error } = await supabase.rpc("rpc_request_identity_reveal", {
        p_match_id: matchId,
      });
      if (error) throw new Error(error.message);
      return toRevealIdentityResponse(data);
    },
  });

  const submitFeedback = async (sparkOutcome: SparkOutcome) => {
    await feedbackMutation.mutateAsync({ sparkOutcome, rating });
    if (!matchId) return;
    trackPilotEvent("post_spark_feedback_submitted", {
      ...pilotMetadata,
      matchId,
      sparkOutcome,
      rating,
    });
  };

  const handleContinueToChat = async () => {
    if (!matchId) return;
    try {
      await submitFeedback("continue_chat");
      navigate(`/chat/${matchId}`, {
        state: {
          prefillMessage: selectedIcebreaker || undefined,
        },
      });
    } catch (error) {
      toast({
        title: "Could not continue",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEndSpark = async () => {
    try {
      await feedbackMutation.mutateAsync({ sparkOutcome: "end_spark", rating: "up" });
      if (matchId) {
        trackPilotEvent("post_spark_feedback_submitted", {
          ...pilotMetadata,
          matchId,
          sparkOutcome: "end_spark",
          rating: "up",
        });
      }
      navigate("/lobby");
    } catch (error) {
      toast({
        title: "Could not finish Spark",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSparkAgain = async () => {
    if (!matchId || !postSparkQuery.data) return;

    try {
      await submitFeedback("spark_again");
      trackPilotEvent("spark_again_requested", {
        ...pilotMetadata,
        matchId,
        usedPass: subscribed,
      });

      const result = await sparkAgainMutation.mutateAsync();
      if (result.rematchMatchId) {
        writeMatchSession({
          matchId: result.rematchMatchId,
          queueId: result.rematchMatchId,
          matchedWith: result.otherUserId ?? postSparkQuery.data.otherUserId,
          roomId: result.roomId ?? postSparkQuery.data.match.room_id,
        });
        toast({ title: "Spark Again is live", description: "Rejoining your call now." });
        navigate("/call");
        return;
      }

      if (result.awaitingOther) {
        const costMessage = result.charged
          ? "You spent 1 token. Waiting for them to accept."
          : "Request sent. Waiting for them to accept.";
        toast({ title: "Spark Again requested", description: costMessage });
      }
    } catch (error) {
      toast({
        title: "Spark Again unavailable",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRevealIdentity = async () => {
    if (!matchId) return;

    if (!subscribed) {
      toast({
        title: "Verity Pass required",
        description: "Reveal Identity is included in Verity Pass.",
      });
      navigate("/tokens");
      return;
    }

    try {
      trackPilotEvent("identity_reveal_requested", {
        ...pilotMetadata,
        matchId,
      });

      const result = await revealMutation.mutateAsync();
      if (result.revealed) {
        toast({ title: "Identity revealed", description: "You can now view each other's profile." });
        void queryClient.invalidateQueries({ queryKey: ["post-spark", matchId, user?.id] });
        return;
      }

      if (result.awaitingOther) {
        toast({ title: "Reveal requested", description: "Waiting for your spark to reveal too." });
      }
    } catch (error) {
      toast({
        title: "Reveal unavailable",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const confettiPieces = useMemo(
    () =>
      Array.from({ length: 24 }, (_, index) => ({
        id: index,
        left: (index * 17) % 100,
        delay: (index % 8) * 0.08,
        duration: 2.6 + (index % 5) * 0.2,
        drift: ((index % 2 === 0 ? 1 : -1) * (14 + (index % 4) * 6)),
      })),
    [],
  );

  if (postSparkQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (postSparkQuery.error || !postSparkQuery.data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl">Could not open Post-Spark</CardTitle>
            <CardDescription>
              {postSparkQuery.error instanceof Error
                ? postSparkQuery.error.message
                : "Please return to your sparks and try again."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate("/sparks")}>
              Back to Sparks
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { match, profile, isFirstSpark } = postSparkQuery.data;
  const revealReady = Boolean(match.identity_revealed_at);

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-xl space-y-4 relative">
        <AnimatePresence>
          {showCelebration && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 overflow-hidden z-10"
            >
              {confettiPieces.map((piece) => (
                <motion.span
                  key={piece.id}
                  className="absolute top-0 h-3 w-2 rounded-full bg-gradient-gold"
                  style={{ left: `${piece.left}%` }}
                  initial={{ y: -20, opacity: 1, rotate: 0 }}
                  animate={{ y: "95vh", opacity: [1, 1, 0], x: piece.drift, rotate: 320 }}
                  transition={{ duration: piece.duration, delay: piece.delay, ease: "easeOut" }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <Card className="glass-card border-primary/25">
          <CardHeader className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  It's a Spark
                </Badge>
                {isFirstSpark && (
                  <Badge className="bg-verity-success/15 text-verity-success border-verity-success/30">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    First-Time Spark
                  </Badge>
                )}
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-gold glow-gold flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="font-display text-3xl">Choose What Happens Next</CardTitle>
            <CardDescription>
              Keep the spark going with a thoughtful opener, run it back with Spark Again, or reveal identities if
              both of you have Verity Pass.
            </CardDescription>
          </CardHeader>
        </Card>

        {revealReady && profile && (
          <Card className="border-verity-success/30 bg-verity-success/5">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-verity-success" />
                Identity Revealed
              </CardTitle>
              <CardDescription>You can now view each other beyond anonymous mode.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-lg font-semibold text-foreground flex items-center gap-2">
                <span>{profile.avatarEmoji ?? "🙂"}</span>
                <span>{profile.displayName ?? "Your Spark"}</span>
              </div>
              {profile.bio && <p className="text-sm text-muted-foreground">{profile.bio}</p>}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Post-Call Feedback</CardTitle>
            <CardDescription>
              Quick signal for quality and safety. Notes help improve moderation and matching.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={rating === "up" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setRating("up")}
              >
                <ThumbsUp className="w-4 h-4 mr-1.5" />
                Positive
              </Button>
              <Button
                type="button"
                variant={rating === "down" ? "destructive" : "outline"}
                className="flex-1"
                onClick={() => setRating("down")}
              >
                <ThumbsDown className="w-4 h-4 mr-1.5" />
                Needs Attention
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-spark-note">Optional note (one line)</Label>
              <Input
                id="post-spark-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={180}
                placeholder="Share a quick thought (optional)"
              />
              <p className="text-xs text-muted-foreground text-right">{note.length}/180</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">AI Icebreakers</CardTitle>
            <CardDescription>Pick a prompt to prefill your first chat message.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {icebreakers.map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => setSelectedIcebreaker(prompt.text)}
                className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                  selectedIcebreaker === prompt.text
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {prompt.text}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              className="w-full h-11 bg-gradient-gold text-primary-foreground"
              onClick={handleContinueToChat}
              disabled={feedbackMutation.isPending || sparkAgainMutation.isPending || revealMutation.isPending}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Continue to Chat
            </Button>

            <Button
              variant="outline"
              className="w-full h-11"
              onClick={handleSparkAgain}
              disabled={sparkAgainMutation.isPending || feedbackMutation.isPending}
            >
              {sparkAgainMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Repeat2 className="w-4 h-4 mr-2" />
              )}
              Spark Again
              <span className="ml-2 text-xs text-muted-foreground">{subscribed ? "Verity Pass" : "1 token"}</span>
            </Button>

            <Button
              variant="outline"
              className="w-full h-11"
              onClick={handleRevealIdentity}
              disabled={revealMutation.isPending}
            >
              {revealMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <UserRoundSearch className="w-4 h-4 mr-2" />
              )}
              Reveal Identity
            </Button>

            {!subscribed && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
                <Crown className="w-3.5 h-3.5 text-primary" />
                Reveal Identity requires an active Verity Pass for both people.
              </p>
            )}

            <Button
              variant="ghost"
              className="w-full h-11 text-muted-foreground hover:text-foreground"
              onClick={handleEndSpark}
              disabled={feedbackMutation.isPending}
            >
              End Spark
            </Button>
          </CardContent>
        </Card>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-xs text-muted-foreground py-1"
        >
          <button
            onClick={() => {
              trackEvent("post_spark_back_to_lobby");
              navigate("/lobby");
            }}
            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          >
            Skip for now
            <Sparkles className="w-3 h-3" />
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default PostSparkScreen;
