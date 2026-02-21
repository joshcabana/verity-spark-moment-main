import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mic, MicOff, VideoOff, Video, Users, LogOut, Shield } from "lucide-react";
import AgoraRTC, {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IAgoraRTCRemoteUser,
} from "agora-rtc-sdk-ng";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

// Mini component to handle remote video playback reliably within a React map
const RemoteUserVideo = ({ user }: { user: IAgoraRTCRemoteUser }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user.videoTrack && containerRef.current) {
      user.videoTrack.play(containerRef.current);
    }
    return () => {
      if (user.videoTrack) user.videoTrack.stop();
    };
  }, [user.videoTrack]);

  return (
    <div className="relative w-full h-full bg-muted/40 rounded-2xl overflow-hidden border border-border/50">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2">
        {user.hasAudio ? <Mic className="w-3 h-3 text-verity-success" /> : <MicOff className="w-3 h-3 text-destructive" />}
        Guest
      </div>
    </div>
  );
};

const VerityCircle = () => {
  const { ownerId } = useParams<{ ownerId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [joined, setJoined] = useState(false);
  const [connectionState, setConnectionState] = useState<"CONNECTED" | "RECONNECTING" | "DISCONNECTED">("CONNECTED");

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const localTracksRef = useRef<{ video: ICameraVideoTrack | null; audio: IMicrophoneAudioTrack | null }>({
    video: null,
    audio: null,
  });

  const cleanup = useCallback(() => {
    localTracksRef.current.video?.stop();
    localTracksRef.current.video?.close();
    localTracksRef.current.audio?.stop();
    localTracksRef.current.audio?.close();

    const videoNode = localVideoRef.current;
    if (videoNode) {
      const videoEl = videoNode.querySelector("video");
      if (videoEl && videoEl.srcObject) {
        const stream = videoEl.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoEl.srcObject = null;
      }
    }

    clientRef.current?.leave().catch(console.error);
  }, []);

  useEffect(() => {
    if (!ownerId || !user) return;

    const channelName = `circle_${ownerId}`;
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    clientRef.current = client;

    const init = async () => {
      try {
        const { data: tokenData, error } = await supabase.functions.invoke("agora-token", {
          body: { channelName, uid: 0 },
        });

        if (error || !tokenData?.token) {
          console.error("Token error:", error);
          toast({ title: "Access denied", description: "You don't have access to this Verity Circle.", variant: "destructive" });
          navigate("/sparks");
          return;
        }

        client.on("user-published", async (remoteUser, mediaType) => {
          await client.subscribe(remoteUser, mediaType);
          if (mediaType === "audio") remoteUser.audioTrack?.play();
          
          setRemoteUsers((prev) => {
            const exists = prev.find((u) => u.uid === remoteUser.uid);
            if (exists) return prev.map((u) => (u.uid === remoteUser.uid ? remoteUser : u));
            return [...prev, remoteUser];
          });
        });

        client.on("user-unpublished", (remoteUser) => {
          setRemoteUsers((prev) => prev.filter((u) => u.uid !== remoteUser.uid));
        });

        client.on("user-left", (remoteUser) => {
          setRemoteUsers((prev) => prev.filter((u) => u.uid !== remoteUser.uid));
        });

        client.on("connection-state-change", (curState, _revState, reason) => {
          if (curState === "RECONNECTING") setConnectionState("RECONNECTING");
          else if (curState === "CONNECTED") setConnectionState("CONNECTED");
          else if (curState === "DISCONNECTED" && reason !== "LEAVE") {
            setConnectionState("DISCONNECTED");
            toast({ title: "Connection lost", description: "Disconnected from the Circle.", variant: "destructive" });
            cleanup();
            navigate("/sparks");
          }
        });

        await client.join(tokenData.appId, channelName, tokenData.token, tokenData.uid);

        const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        localTracksRef.current = { video: videoTrack, audio: audioTrack };

        if (localVideoRef.current) {
          videoTrack.play(localVideoRef.current);
        }

        await client.publish([audioTrack, videoTrack]);
        setJoined(true);
      } catch (err) {
        console.error("Agora init error:", err);
        toast({ title: "Camera/mic error", description: "Please allow camera and microphone access.", variant: "destructive" });
      }
    };

    init();
    return () => cleanup();
  }, [ownerId, user, navigate, cleanup]);

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

  // Determine optimal grid layout based on participant count
  const totalParticipants = remoteUsers.length + 1; // +1 for self
  let gridCols = "grid-cols-1";
  if (totalParticipants >= 2 && totalParticipants <= 4) gridCols = "grid-cols-2";
  if (totalParticipants >= 5 && totalParticipants <= 9) gridCols = "grid-cols-3";

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 px-6 py-4 flex items-center justify-between bg-gradient-to-b from-background/80 to-transparent backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-verity-success/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-verity-success" />
          </div>
          <div>
            <h1 className="font-display font-bold text-foreground">Verity Circle</h1>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              {connectionState === "RECONNECTING" ? "Reconnecting..." : `${totalParticipants} Live`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-secondary/80 px-3 py-1.5 rounded-full border border-border/50">
          <Shield className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Private Group</span>
        </div>
      </div>

      {/* Video Grid */}
      <div className={`flex-1 p-6 pt-24 pb-32 grid gap-4 ${gridCols} auto-rows-fr`}>
        {/* Self View */}
        <div className="relative w-full h-full bg-muted/40 rounded-2xl overflow-hidden border border-primary/30 glow-gold-sm">
          <div ref={localVideoRef} className="absolute inset-0" />
          <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-primary">
            You
          </div>
          {isVideoOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-md">
              <VideoOff className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Remote Views */}
        {remoteUsers.map((remoteUser) => (
          <RemoteUserVideo key={remoteUser.uid} user={remoteUser} />
        ))}
        
        {/* Empty State for 1 person */}
        {totalParticipants === 1 && joined && (
          <div className="relative w-full h-full bg-secondary/30 rounded-2xl border border-dashed border-border/50 flex flex-col items-center justify-center text-center p-6">
            <Users className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-foreground font-medium mb-1">You're the first one here</h3>
            <p className="text-sm text-muted-foreground">Waiting for your mutual sparks to join the circle...</p>
          </div>
        )}
      </div>

      {/* Simple Control Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent pb-10">
        <div className="max-w-md mx-auto flex items-center justify-center gap-6">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isMuted ? "bg-secondary text-muted-foreground" : "bg-primary/20 text-primary border border-primary/30"
            }`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
              isVideoOff ? "bg-secondary text-muted-foreground" : "bg-primary/20 text-primary border border-primary/30"
            }`}
          >
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              cleanup();
              navigate("/sparks");
            }}
            className="w-14 h-14 rounded-full bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center hover:bg-destructive hover:text-white transition-colors"
          >
            <LogOut className="w-6 h-6 ml-1" />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default VerityCircle;
