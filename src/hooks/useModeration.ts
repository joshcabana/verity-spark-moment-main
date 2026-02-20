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

export const useModeration = ({ matchId, victimId, onWarning, onTerminate }: UseModerationOptions) => {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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

  const moderateFrame = useCallback(async () => {
    if (moderatingRef.current) return; // Skip if previous still processing
    moderatingRef.current = true;

    try {
      const frameBase64 = captureFrame();
      if (!frameBase64) return;

      const { data, error } = await supabase.functions.invoke("ai-moderate", {
        body: { frameBase64, matchId, victimId },
      });

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
  }, [captureFrame, matchId, victimId, onWarning, onTerminate]);

  const startModeration = useCallback((videoElement: HTMLVideoElement) => {
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

    // Sample every 5 seconds (spec says 5-10 fps but we use lower for cost)
    // First check at 3s, then every 8s
    initialTimeoutRef.current = setTimeout(() => moderateFrame(), 3000);
    intervalRef.current = setInterval(moderateFrame, 8000);
  }, [moderateFrame]);

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
  }, []);

  return {
    startModeration,
    stopModeration,
    lastResult,
    warningVisible,
    setWarningVisible,
  };
};
