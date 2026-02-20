import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, AlertTriangle, Mic, MicOff, VideoOff, Video, Sparkles } from "lucide-react";
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

const VideoCall = () => {
  const [timeLeft, setTimeLeft] = useState(45);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [showSafeExit, setShowSafeExit] = useState(false);
  const [remoteUser, setRemoteUser] = useState<IAgoraRTCRemoteUser | null>(null);
  const [joined, setJoined] = useState(false);
  const [extended, setExtended] = useState(false);
  const [extending, setExtending] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const localVideoElRef = useRef<HTMLVideoElement | null>(null);
  const localTracksRef = useRef<{ video: ICameraVideoTrack | null; audio: IMicrophoneAudioTrack | null }>({
    video: null,
    audio: null,
  });

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
    localTracksRef.current.video?.close();
    localTracksRef.current.audio?.close();
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

        await client.join(tokenData.appId, channelName, tokenData.token, tokenData.uid);

        const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        localTracksRef.current = { video: videoTrack, audio: audioTrack };

        if (localVideoRef.current) {
          videoTrack.play(localVideoRef.current);
          // Get the video element for moderation frame capture
          const videoEl = localVideoRef.current.querySelector("video");
          if (videoEl) {
            localVideoElRef.current = videoEl;
            startModeration(videoEl);
          }
        }

        await client.publish([audioTrack, videoTrack]);
        setJoined(true);
      } catch (err) {
        console.error("Agora init error:", err);
        toast({ title: "Camera/mic error", description: "Please allow camera and microphone access.", variant: "destructive" });
      }
    };

    init();

    return () => { cleanup(); };
  }, [user, startModeration, cleanup]);

  // Timer countdown
  useEffect(() => {
    if (!isSessionValid) return;
    if (timeLeft <= 0) {
      cleanup();
      navigate("/match");
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, navigate, cleanup, isSessionValid]);

  const handleSafeExit = useCallback(() => {
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
        setTimeLeft((t) => t + data.extraSeconds);
        setExtended(true);
        toast({ title: "Spark Extended! ✨", description: "+90 seconds added to your call." });
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
