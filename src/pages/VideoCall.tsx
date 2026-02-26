import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, AlertTriangle, Mic, MicOff, VideoOff, Video, Sparkles, WifiOff } from "lucide-react";
import AgoraRTC, {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser,
} from "agora-rtc-sdk-ng";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { useModeration } from "@/hooks/useModeration";
import ModerationWarning from "@/components/ModerationWarning";
import CallControls from "@/components/CallControls";
import TimerRing from "@/components/TimerRing";
import SafeExitModal from "@/components/SafeExitModal";
import { readMatchSession } from "@/lib/match-session";
import { getPilotMetadata, trackEvent, trackPilotEvent } from "@/lib/analytics";

const VideoCall = () => {
  const [timeLeft, setTimeLeft] = useState(45);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showSafeExit, setShowSafeExit] = useState(false);
  const [remoteUser, setRemoteUser] = useState<IAgoraRTCRemoteUser | null>(null);
  const [joined, setJoined] = useState(false);
  const [extended, setExtended] = useState(false);
  const [extending, setExtending] = useState(false);
  const [connectionState, setConnectionState] = useState<"CONNECTED" | "RECONNECTING" | "DISCONNECTED">("CONNECTED");
  const connectionStateRef = useRef<"CONNECTED" | "RECONNECTING" | "DISCONNECTED">("CONNECTED");
  const navigate = useNavigate();
  const { user } = useAuth();
  const pilotMetadata = useMemo(() => getPilotMetadata(user?.user_metadata), [user?.user_metadata]);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const localVideoElRef = useRef<HTMLVideoElement | null>(null);
  const localTracksRef = useRef<{ video: ICameraVideoTrack | null; audio: IMicrophoneAudioTrack | null }>({
    video: null,
    audio: null,
  });
  const callStartedAtRef = useRef<number | null>(null);
  const callStartedTrackedRef = useRef(false);
  const callCompletedTrackedRef = useRef(false);

  // Get match info
  const matchInfo = useRef(readMatchSession());
  const isSessionValid = Boolean(matchInfo.current);

  useEffect(() => {
    if (!isSessionValid) {
      toast({ title: "Call session invalid", description: "Please reconnect from lobby.", variant: "destructive" });
      navigate("/lobby");
    }
  }, [isSessionValid, navigate]);

  // Live AI moderation
  const { startModeration, stopModeration, warningVisible, setWarningVisible, lastResult } = useModeration({
    matchId: matchInfo.current?.matchId,
    victimId: matchInfo.current?.matchedWith,
    onWarning: () => {
      // Warning is shown via warningVisible state
    },
    onTerminate: () => {
      // Instant call termination for Tier 0
      toast({ title: "Call ended", description: "This call was ended for a policy violation.", variant: "destructive" });
      cleanup();
      navigate("/lobby");
    },
  });

  const cleanup = useCallback(() => {
    stopModeration();
    
    // Rigorously close all Agora tracks
    localTracksRef.current.video?.stop();
    localTracksRef.current.video?.close();
    localTracksRef.current.audio?.stop();
    localTracksRef.current.audio?.close();

    // Force-stop any underlying MediaStream tracks to release hardware indicators immediately
    if (localVideoElRef.current?.srcObject) {
      const stream = localVideoElRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      localVideoElRef.current.srcObject = null;
    }

    clientRef.current?.leave().catch(console.error);
  }, [stopModeration]);

  // Join Agora channel
  useEffect(() => {
    if (!matchInfo.current?.matchedWith || !user) return;

    const { matchId, matchedWith } = matchInfo.current;
    const channelName = matchId || [user.id, matchedWith].sort().join("-").slice(0, 48);

    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    clientRef.current = client;

    const init = async () => {
      try {
        const { data: tokenData, error } = await supabase.functions.invoke("agora-token", {
          body: { channelName, uid: 0 },
        });
        if (error || !tokenData?.token) {
          console.error("Failed to get Agora token:", error);
          toast({ title: "Connection error", description: "Could not join video call.", variant: "destructive" });
          return;
        }

        client.on("user-published", async (remoteUser, mediaType) => {
          await client.subscribe(remoteUser, mediaType);
          if (mediaType === "video" && remoteVideoRef.current) {
            remoteUser.videoTrack?.play(remoteVideoRef.current);
          }
          if (mediaType === "audio") {
            remoteUser.audioTrack?.play();
          }
          setRemoteUser(remoteUser);
        });

        client.on("user-unpublished", (_, mediaType) => {
          if (mediaType === "video" && remoteVideoRef.current) {
            remoteVideoRef.current.innerHTML = "";
          }
        });

        client.on("user-left", () => {
          setRemoteUser(null);
          if (remoteVideoRef.current) remoteVideoRef.current.innerHTML = "";
        });

        // Connection state tracking for reconnection UX
        client.on("connection-state-change", (curState, _revState, reason) => {
          const previousState = connectionStateRef.current;
          if (curState === "RECONNECTING") {
            connectionStateRef.current = "RECONNECTING";
            setConnectionState("RECONNECTING");
            toast({ title: "Reconnecting...", description: "Your connection dropped briefly. Trying to reconnect." });
          } else if (curState === "CONNECTED") {
            if (previousState === "RECONNECTING") {
              toast({ title: "Reconnected", description: "Your call is back." });
            }
            connectionStateRef.current = "CONNECTED";
            setConnectionState("CONNECTED");
          } else if (curState === "DISCONNECTED" && reason !== "LEAVE") {
            connectionStateRef.current = "DISCONNECTED";
            setConnectionState("DISCONNECTED");
            toast({ title: "Connection lost", description: "Could not reconnect. Returning to lobby.", variant: "destructive" });
            cleanup();
            navigate("/lobby");
          }
        });

        await client.join(tokenData.appId, channelName, tokenData.token, tokenData.uid);

        const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        localTracksRef.current = { video: videoTrack, audio: audioTrack };

        if (localVideoRef.current) {
          videoTrack.play(localVideoRef.current);
          // Get the video element for moderation frame capture
          const videoEl = localVideoRef.current.querySelector("video");
          if (videoEl) {
            localVideoElRef.current = videoEl;
            // Pass audio MediaStream for audio moderation capture
            const audioMediaStream = audioTrack.getMediaStreamTrack
              ? new MediaStream([audioTrack.getMediaStreamTrack()])
              : undefined;
            startModeration(videoEl, audioMediaStream);
          }
        }

        await client.publish([audioTrack, videoTrack]);
        if (!callStartedTrackedRef.current && matchInfo.current?.matchId) {
          callStartedTrackedRef.current = true;
          callStartedAtRef.current = Date.now();
          trackPilotEvent("call_started", {
            ...pilotMetadata,
            matchId: matchInfo.current.matchId,
            roomId: matchInfo.current.roomId,
          });
        }
        setJoined(true);
      } catch (err) {
        console.error("Agora init error:", err);
        toast({ title: "Camera/mic error", description: "Please allow camera and microphone access.", variant: "destructive" });
      }
    };

    init();

    return () => { cleanup(); };
  }, [user, startModeration, cleanup, pilotMetadata, navigate]);

  // Timer countdown — paused during reconnection
  useEffect(() => {
    if (!isSessionValid) return;
    if (connectionState === "RECONNECTING") return; // Freeze timer while reconnecting
    if (timeLeft <= 0) {
      if (!callCompletedTrackedRef.current && matchInfo.current?.matchId) {
        const elapsedSeconds = callStartedAtRef.current
          ? Math.max(0, Math.round((Date.now() - callStartedAtRef.current) / 1000))
          : 45;
        callCompletedTrackedRef.current = true;
        trackPilotEvent("call_completed", {
          ...pilotMetadata,
          matchId: matchInfo.current.matchId,
          roomId: matchInfo.current.roomId,
          durationSeconds: elapsedSeconds,
          extended,
        });
      }
      cleanup();
      navigate("/match", { state: { from: "video_call" } });
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, navigate, cleanup, isSessionValid, connectionState, extended, pilotMetadata]);

  const handleSafeExit = useCallback(() => {
    trackEvent("safe_exit_used");
    cleanup();
    navigate("/lobby");
  }, [navigate, cleanup]);

  const toggleMute = () => {
    const audioTrack = localTracksRef.current.audio;
    if (audioTrack) {
      audioTrack.setEnabled(isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    const videoTrack = localTracksRef.current.video;
    if (videoTrack) {
      videoTrack.setEnabled(isVideoOff);
      setIsVideoOff(!isVideoOff);
    }
  };

  const handleSparkExtend = async () => {
    if (extended || extending) return;
    setExtending(true);
    try {
      const { data, error } = await supabase.functions.invoke("spark-extend");
      if (error) throw error;
      if (data?.success) {
        trackEvent("call_extended", { freeExtension: !!data.freeExtension });
        setTimeLeft((t) => t + data.extraSeconds);
        setExtended(true);
        const description = data.freeExtension
          ? "+90 seconds added — free with your Verity Pass!"
          : "+90 seconds added to your call.";
        toast({ title: "Spark Extended! ✨", description });
      } else {
        toast({ title: "Not enough tokens", description: "Get more tokens to extend.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Could not extend call.", variant: "destructive" });
    } finally {
      setExtending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Remote video */}
      <div className="flex-1 relative overflow-hidden">
        <div
          ref={remoteVideoRef}
          className="absolute inset-0 bg-gradient-to-br from-verity-surface via-card to-secondary"
        >
          {!remoteUser && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-muted/30 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          )}
        </div>

        {/* Self view */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          ref={localVideoRef}
          className="absolute bottom-24 right-4 w-28 h-36 rounded-2xl bg-muted/40 border border-border/50 overflow-hidden"
        />

        {/* Timer ring */}
        <TimerRing timeLeft={timeLeft} maxTime={45} />

        {/* AI Moderation badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute top-8 left-4 flex items-center gap-1.5 bg-verity-success/10 border border-verity-success/20 rounded-full px-3 py-1.5"
        >
          <Shield className="w-3 h-3 text-verity-success" />
          <span className="text-[10px] text-verity-success font-medium">Moderated by Verity AI</span>
          <div className="w-1.5 h-1.5 rounded-full bg-verity-success animate-pulse" />
        </motion.div>

        {/* Anonymous notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute top-8 right-4 bg-card/60 backdrop-blur-md rounded-full px-3 py-1.5"
        >
          <span className="text-[10px] text-muted-foreground">Anonymous · No recording</span>
        </motion.div>

        {/* Reconnection overlay */}
        <AnimatePresence>
          {connectionState === "RECONNECTING" && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-16 left-4 right-4 flex items-center justify-center gap-2 bg-amber-500/90 backdrop-blur-md text-white text-sm font-medium px-4 py-2.5 rounded-xl z-10"
            >
              <WifiOff className="w-4 h-4" />
              Reconnecting... Timer paused.
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Moderation Warning Overlay (Tier 1 - shown to offender only) */}
        <ModerationWarning
          visible={warningVisible}
          category={lastResult?.category}
          onDismiss={() => setWarningVisible(false)}
        />
      </div>

      {/* Controls */}
      <CallControls
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        extended={extended}
        extending={extending}
        timeLeft={timeLeft}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onSparkExtend={handleSparkExtend}
        onSafeExit={() => setShowSafeExit(true)}
      />

      {/* Safe Exit Confirmation */}
      <SafeExitModal
        visible={showSafeExit}
        onExit={handleSafeExit}
        onCancel={() => setShowSafeExit(false)}
      />
    </div>
  );
};

export default VideoCall;
