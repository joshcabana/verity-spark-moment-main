import { useRef, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ModerationResult {
  action: "none" | "warning" | "terminate";
  category?: string;
  confidence?: number;
  reasoning?: string;
  latencyMs?: number;
}

interface UseModerationOptions {
  matchId?: string;
  victimId?: string;
  onWarning?: (result: ModerationResult) => void;
  onTerminate?: (result: ModerationResult) => void;
}

/** Convert a Blob to a base64 string (without the data URL prefix). */
const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

export const useModeration = ({ matchId, victimId, onWarning, onTerminate }: UseModerationOptions) => {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const pendingAudioRef = useRef<string | null>(null);
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const [lastResult, setLastResult] = useState<ModerationResult | null>(null);
  const [warningVisible, setWarningVisible] = useState(false);
  const moderatingRef = useRef(false);

  const captureFrame = useCallback((): string | null => {
    const video = videoElementRef.current;
    if (!video || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    canvas.width = 320; // Lower res for speed
    canvas.height = 240;
    ctx.drawImage(video, 0, 0, 320, 240);
    return canvas.toDataURL("image/jpeg", 0.6).split(",")[1];
  }, []);

  /** Record a short audio clip (~2s) and store it for the next moderation tick. */
  const captureAudioClip = useCallback(() => {
    const stream = audioStreamRef.current;
    if (!stream || stream.getAudioTracks().length === 0) return;

    // Don't start a new recording if one is already in progress
    if (audioRecorderRef.current && audioRecorderRef.current.state === "recording") return;

    try {
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        if (chunks.length === 0) return;
        const blob = new Blob(chunks, { type: mimeType });
        // Only keep clips under 500KB to avoid overloading the edge function
        if (blob.size > 512_000) return;
        try {
          pendingAudioRef.current = await blobToBase64(blob);
        } catch {
          // Silently ignore encoding failures
        }
      };

      audioRecorderRef.current = recorder;
      recorder.start();

      // Stop after 2 seconds to get a short clip
      setTimeout(() => {
        if (recorder.state === "recording") {
          recorder.stop();
        }
      }, 2000);
    } catch {
      // MediaRecorder may not be supported in all browsers
    }
  }, []);

  const moderateFrame = useCallback(async () => {
    if (moderatingRef.current) return; // Skip if previous still processing
    moderatingRef.current = true;

    try {
      const frameBase64 = captureFrame();
      if (!frameBase64) return;

      // Grab any pending audio clip and clear it
      const audioBase64 = pendingAudioRef.current;
      pendingAudioRef.current = null;

      const body: Record<string, unknown> = { frameBase64, matchId, victimId };
      if (audioBase64) {
        body.audioBase64 = audioBase64;
      }

      const { data, error } = await supabase.functions.invoke("ai-moderate", { body });

      if (error) {
        console.error("Moderation error:", error);
        return;
      }

      const result = data as ModerationResult;
      setLastResult(result);

      if (result.action === "warning") {
        setWarningVisible(true);
        onWarning?.(result);
        if (warningTimeoutRef.current) {
          clearTimeout(warningTimeoutRef.current);
        }
        // Auto-hide warning after 5s.
        warningTimeoutRef.current = setTimeout(() => setWarningVisible(false), 5000);
      } else if (result.action === "terminate") {
        onTerminate?.(result);
      }
    } catch (err) {
      console.error("Moderation frame error:", err);
    } finally {
      moderatingRef.current = false;
    }

    // Start recording the next audio clip for the next moderation tick
    captureAudioClip();
  }, [captureFrame, captureAudioClip, matchId, victimId, onWarning, onTerminate]);

  const startModeration = useCallback((videoElement: HTMLVideoElement, audioStream?: MediaStream) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (initialTimeoutRef.current) {
      clearTimeout(initialTimeoutRef.current);
    }

    // Create a hidden canvas for frame capture
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
    videoElementRef.current = videoElement;

    // Store audio stream for clip capture
    if (audioStream) {
      audioStreamRef.current = audioStream;
    }

    // First check at 3s, then every 8s
    // Start the first audio capture slightly before the first moderation tick
    initialTimeoutRef.current = setTimeout(() => {
      captureAudioClip();
      moderateFrame();
    }, 3000);
    intervalRef.current = setInterval(moderateFrame, 8000);
  }, [moderateFrame, captureAudioClip]);

  const stopModeration = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (initialTimeoutRef.current) {
      clearTimeout(initialTimeoutRef.current);
      initialTimeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (audioRecorderRef.current && audioRecorderRef.current.state === "recording") {
      audioRecorderRef.current.stop();
    }
    audioRecorderRef.current = null;
    audioStreamRef.current = null;
    pendingAudioRef.current = null;
  }, []);

  return {
    startModeration,
    stopModeration,
    lastResult,
    warningVisible,
    setWarningVisible,
  };
};
