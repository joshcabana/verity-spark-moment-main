import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Video, Moon, Briefcase, Palette, Users, Clock, Heart, Zap, Shield, Phone, Crown } from "lucide-react";
import AppNav from "@/components/AppNav";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { writeMatchSession } from "@/lib/match-session";
import type { VerityMatchSession } from "@/lib/match-session";
import { trackEvent } from "@/lib/analytics";

const themedRooms = [
  { id: "general", name: "Open Room", icon: Heart, desc: "Anyone, anytime", color: "text-primary", premium: false },
  { id: "night-owls", name: "Night Owls", icon: Moon, desc: "Late-night connections", color: "text-blue-400", premium: true },
  { id: "tech", name: "Tech Professionals", icon: Briefcase, desc: "Industry insiders", color: "text-emerald-400", premium: true },
  { id: "creatives", name: "Creatives & Makers", icon: Palette, desc: "Artists, writers, builders", color: "text-pink-400", premium: true },
  { id: "over-35", name: "Over 35", icon: Users, desc: "Mature connections", color: "text-amber-400", premium: true },
  { id: "introverts", name: "Introvert Hours", icon: Clock, desc: "Low-pressure vibes", color: "text-violet-400", premium: true },
];

interface MatchmakingResponse {
  matched?: boolean;
  matchId?: string | null;
  matchedWith?: string | null;
  roomId?: string;
  queueId?: string;
  freeEntries?: number;
  balance?: number;
  error?: string;
}

interface QueueRealtimeRow {
  id: string;
  status: string;
  matched_with: string | null;
  room_id: string;
  match_id?: string | null;
}

const toMatchmakingResponse = (value: unknown): MatchmakingResponse => {
  if (!value || typeof value !== "object") return {};
  return value as MatchmakingResponse;
};

const Lobby = () => {
  const [selectedRoom, setSelectedRoom] = useState("general");
  const [isSearching, setIsSearching] = useState(false);
  const [warmupEnabled, setWarmupEnabled] = useState(false);
  const [freeEntries, setFreeEntries] = useState(5);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [banned, setBanned] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const navigate = useNavigate();
  const { user, subscribed } = useAuth();

  const pollIntervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const queueIdRef = useRef<string | null>(null);

  const clearSearchWatchers = useCallback(() => {
    if (pollIntervalRef.current !== null) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (queueIdRef.current) {
        void supabase.rpc("rpc_cancel_matchmaking", { p_queue_id: queueIdRef.current });
        queueIdRef.current = null;
      }
      clearSearchWatchers();
    };
  }, [clearSearchWatchers]);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const { data: bans } = await supabase
        .from("user_bans")
        .select("*")
        .eq("user_id", user.id)
        .is("lifted_at", null)
        .order("created_at", { ascending: false })
        .limit(1);

      if (bans && bans.length > 0) {
        const ban = bans[0];
        if (!ban.expires_at || new Date(ban.expires_at) > new Date()) {
          setBanned(true);
          setBanReason(ban.reason);
          return;
        }
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("verified_phone")
        .eq("user_id", user.id)
        .single();
      setPhoneVerified(profile?.verified_phone ?? false);

      const { data } = await supabase
        .from("user_tokens")
        .select("free_entries_remaining, balance, free_entries_reset_at")
        .eq("user_id", user.id)
        .single();

      if (data) {
        const resetPassed = new Date(data.free_entries_reset_at) < new Date();
        setFreeEntries(resetPassed ? 5 : data.free_entries_remaining);
        setTokenBalance(data.balance);
      }
    };

    load();
  }, [user]);

  const commitMatchAndNavigate = useCallback(
    (payload: VerityMatchSession) => {
      queueIdRef.current = null;
      clearSearchWatchers();
      writeMatchSession(payload);
      navigate("/call");
    },
    [clearSearchWatchers, navigate],
  );

  const handleGoLive = async () => {
    if (!user || isSearching) return;

    if (banned) {
      toast({ title: "Account suspended", description: banReason, variant: "destructive" });
      navigate("/appeals");
      return;
    }

    if (!phoneVerified) {
      toast({
        title: "Phone verification required",
        description: "Please verify your phone number before going live.",
        variant: "destructive",
      });
      navigate("/onboarding");
      return;
    }

    setIsSearching(true);
    trackEvent("go_live_clicked", { roomId: selectedRoom, isWarmup: warmupEnabled });

    const { data, error } = await supabase.rpc("rpc_enter_matchmaking", {
      p_room_id: selectedRoom,
      p_is_warmup: warmupEnabled,
    });

    if (error) {
      toast({ title: "Matching error", description: "Could not join queue.", variant: "destructive" });
      setIsSearching(false);
      return;
    }

    const response = toMatchmakingResponse(data);
    if (typeof response.freeEntries === "number") setFreeEntries(response.freeEntries);
    if (typeof response.balance === "number") setTokenBalance(response.balance);

    if (response.error === "banned") {
      toast({ title: "Account suspended", description: "Your account cannot enter matchmaking.", variant: "destructive" });
      setIsSearching(false);
      navigate("/appeals");
      return;
    }

    if (response.error === "premium_room_locked") {
      toast({ title: "Premium room", description: "This room requires 1 token or a Verity Pass.", variant: "destructive" });
      setIsSearching(false);
      return;
    }

    if (response.error === "no_entries") {
      toast({ title: "No entries left", description: "Get more tokens to continue.", variant: "destructive" });
      setIsSearching(false);
      navigate("/tokens");
      return;
    }

    if (response.matched && response.matchId && response.matchedWith && response.queueId) {
      commitMatchAndNavigate({
        matchId: response.matchId,
        matchedWith: response.matchedWith,
        roomId: response.roomId ?? selectedRoom,
        queueId: response.queueId,
      });
      return;
    }

    const queueId = response.queueId;
    if (!queueId) {
      toast({ title: "Matching error", description: "No queue entry was created.", variant: "destructive" });
      setIsSearching(false);
      return;
    }
    queueIdRef.current = queueId;

    channelRef.current = supabase
      .channel("my-queue")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "match_queue",
          filter: `id=eq.${queueId}`,
        },
        (payload) => {
          const entry = payload.new as QueueRealtimeRow;
          if (entry.status === "matched" && entry.matched_with && entry.match_id) {
            commitMatchAndNavigate({
              matchId: entry.match_id,
              matchedWith: entry.matched_with,
              roomId: entry.room_id,
              queueId: entry.id,
            });
          }
        },
      )
      .subscribe();

    pollIntervalRef.current = window.setInterval(async () => {
      const { data: queueData } = await supabase
        .from("match_queue")
        .select("id,status,matched_with,room_id,match_id")
        .eq("id", queueId)
        .single();

      const row = queueData as QueueRealtimeRow | null;
      if (row?.status === "matched" && row.matched_with && row.match_id) {
        commitMatchAndNavigate({
          matchId: row.match_id,
          matchedWith: row.matched_with,
          roomId: row.room_id,
          queueId: row.id,
        });
      }
    }, 3000);

    timeoutRef.current = window.setTimeout(async () => {
      clearSearchWatchers();
      await supabase.rpc("rpc_cancel_matchmaking", { p_queue_id: queueId });
      queueIdRef.current = null;
      setIsSearching(false);
      toast({ title: "No match found", description: "Try again or switch rooms.", variant: "destructive" });
    }, 30000);
  };

  return (
    <div className="min-h-screen bg-background px-6 pt-8 pb-24">
      <div className="max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-gradient-gold mb-1">Go Live</h1>
          <p className="text-muted-foreground text-sm">Choose a room. Tap Go Live. Meet someone real.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-4 mb-6 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-primary" />
            <div>
              <div className="text-sm font-medium text-foreground">{freeEntries} free entries left</div>
              <div className="text-xs text-muted-foreground">Resets weekly · {tokenBalance} tokens</div>
            </div>
          </div>
          <button onClick={() => navigate("/tokens")} className="text-xs text-primary font-medium hover:underline">
            Get more
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="glass-card rounded-2xl p-4 mb-6 flex items-center justify-between"
        >
          <div>
            <div className="text-sm font-medium text-foreground">Warm-up Mode</div>
            <div className="text-xs text-muted-foreground">First 3 calls are platonic practice rounds</div>
          </div>
          <button
            onClick={() => setWarmupEnabled(!warmupEnabled)}
            className={`w-10 h-6 rounded-full border flex items-center p-0.5 transition-colors ${
              warmupEnabled ? "bg-primary/20 border-primary/30" : "bg-secondary border-border"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full transition-all ${
                warmupEnabled ? "bg-primary translate-x-4" : "bg-muted-foreground/50 translate-x-0"
              }`}
            />
          </button>
        </motion.div>

        <div className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Themed Rooms</h2>
          <div className="grid grid-cols-2 gap-3">
            {themedRooms.map((room) => (
              <motion.button
                key={room.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedRoom(room.id)}
                className={`relative glass-card rounded-xl p-4 text-left transition-all ${
                  selectedRoom === room.id ? "border-primary/50 glow-gold-sm" : "hover:border-border"
                }`}
              >
                {room.premium && !subscribed && (
                  <span className="absolute top-2 right-2 flex items-center gap-1 bg-primary/10 text-primary text-[9px] font-medium px-1.5 py-0.5 rounded-full">
                    <Crown className="w-2.5 h-2.5" />1 token
                  </span>
                )}
                {room.premium && subscribed && (
                  <span className="absolute top-2 right-2 flex items-center gap-1 bg-verity-success/10 text-verity-success text-[9px] font-medium px-1.5 py-0.5 rounded-full">
                    <Crown className="w-2.5 h-2.5" />Pass
                  </span>
                )}
                <room.icon className={`w-5 h-5 ${room.color} mb-2`} />
                <div className="text-sm font-medium text-foreground">{room.name}</div>
                <div className="text-xs text-muted-foreground">{room.desc}</div>
              </motion.button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mb-6">
          {phoneVerified && (
            <div className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-verity-success" />
              <span className="text-verity-success font-medium">Phone verified ✓</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-verity-success" />
            <span>AI moderated · 99.8% safe</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!isSearching ? (
            <motion.button
              key="golive"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGoLive}
              className="w-full bg-gradient-gold text-primary-foreground font-bold text-xl py-5 rounded-full glow-gold flex items-center justify-center gap-3"
            >
              <Video className="w-6 h-6" />
              Go Live
            </motion.button>
          ) : (
            <motion.div
              key="searching"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-5"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-foreground font-medium">Finding your spark...</p>
              <p className="text-muted-foreground text-sm mt-1">Matching you with someone real</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AppNav />
    </div>
  );
};

export default Lobby;
