import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, RefreshCw, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SelfieCaptureProps {
  onVerified: (selfieUrl: string) => void;
  onSkip?: () => void;
}

const SelfieCapture = ({ onVerified, onSkip }: SelfieCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [captured, setCaptured] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<{ passed: boolean; reason: string } | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      toast({ title: "Camera access denied", description: "Please allow camera access for verification.", variant: "destructive" });
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => { stopCamera(); };
  }, [stopCamera]);

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 640;
    canvas.height = 480;
    ctx.drawImage(videoRef.current, 0, 0, 640, 480);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCaptured(dataUrl);
    stopCamera();
  };

  const retake = () => {
    setCaptured(null);
    setResult(null);
    startCamera();
  };

  const verify = async () => {
    if (!captured) return;
    setVerifying(true);
    setResult(null);

    try {
      const base64 = captured.split(",")[1];
      const { data, error } = await supabase.functions.invoke("verify-selfie", {
        body: { imageBase64: base64 },
      });

      if (error) throw error;

      if (data?.passed) {
        setResult({ passed: true, reason: data.reason || "Verification passed!" });
        // Upload selfie to storage
        const userId = (await supabase.auth.getUser()).data.user?.id;
        if (userId) {
          const blob = await fetch(captured).then((r) => r.blob());
          const filePath = `${userId}/selfie.jpg`;
          await supabase.storage.from("selfie-verification").upload(filePath, blob, {
            contentType: "image/jpeg",
            upsert: true,
          });
          // Update profile
          await supabase.from("profiles").update({
            verification_status: "verified",
            selfie_url: filePath,
          }).eq("user_id", userId);

          setTimeout(() => onVerified(filePath), 1200);
        }
      } else {
        setResult({ passed: false, reason: data?.reason || "Verification failed. Please try again." });
      }
    } catch (err) {
      console.error("Selfie verification error:", err);
      setResult({ passed: false, reason: "Verification failed. Please try again with better lighting." });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="w-full">
      <canvas ref={canvasRef} className="hidden" />

      {!cameraActive && !captured && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="w-48 h-48 mx-auto mb-6 rounded-full bg-secondary/50 border-2 border-dashed border-border flex items-center justify-center">
            <Camera className="w-12 h-12 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm mb-6">
            Take a quick selfie to verify you're a real person. This is never shown to other users.
          </p>
          <button
            onClick={startCamera}
            className="w-full bg-gradient-gold text-primary-foreground font-semibold py-4 rounded-full glow-gold flex items-center justify-center gap-2"
          >
            <Camera className="w-4 h-4" />
            Open Camera
          </button>
        </motion.div>
      )}

      {cameraActive && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="relative rounded-2xl overflow-hidden mb-4">
            <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-2xl" style={{ transform: "scaleX(-1)" }} />
            <div className="absolute inset-0 border-2 border-primary/30 rounded-2xl pointer-events-none" />
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-card/80 backdrop-blur-sm rounded-full px-3 py-1">
              <span className="text-xs text-foreground">Center your face</span>
            </div>
          </div>
          <button
            onClick={capture}
            className="w-full bg-gradient-gold text-primary-foreground font-semibold py-4 rounded-full glow-gold flex items-center justify-center gap-2"
          >
            <Camera className="w-4 h-4" />
            Take Selfie
          </button>
        </motion.div>
      )}

      {captured && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="relative rounded-2xl overflow-hidden mb-4">
            <img src={captured} alt="Selfie" className="w-full rounded-2xl" style={{ transform: "scaleX(-1)" }} />
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`absolute inset-0 flex items-center justify-center ${
                    result.passed ? "bg-verity-success/20" : "bg-destructive/20"
                  }`}
                >
                  {result.passed ? (
                    <CheckCircle className="w-16 h-16 text-verity-success" />
                  ) : (
                    <XCircle className="w-16 h-16 text-destructive" />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {result && (
            <p className={`text-sm text-center mb-4 ${result.passed ? "text-verity-success" : "text-destructive"}`}>
              {result.reason}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={retake}
              className="flex-1 bg-secondary text-secondary-foreground font-medium py-3 rounded-xl flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retake
            </button>
            {!result?.passed && (
              <button
                onClick={verify}
                disabled={verifying}
                className="flex-1 bg-gradient-gold text-primary-foreground font-semibold py-3 rounded-full glow-gold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {verifying ? "Verifying..." : "Verify"}
              </button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default SelfieCapture;
