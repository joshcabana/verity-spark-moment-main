import { Mic, MicOff, VideoOff, Video, AlertTriangle, Sparkles } from "lucide-react";

interface CallControlsProps {
  isMuted: boolean;
  isVideoOff: boolean;
  extended: boolean;
  extending: boolean;
  timeLeft: number;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onSparkExtend: () => void;
  onSafeExit: () => void;
}

const CallControls = ({
  isMuted, isVideoOff, extended, extending, timeLeft,
  onToggleMute, onToggleVideo, onSparkExtend, onSafeExit,
}: CallControlsProps) => {
  return (
    <div className="bg-card/90 backdrop-blur-xl border-t border-border/30 px-6 py-4">
      <div className="max-w-lg mx-auto flex items-center justify-between">
        <button
          onClick={onToggleMute}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            isMuted ? "bg-destructive/20 text-destructive" : "bg-secondary text-secondary-foreground"
          }`}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {!extended && timeLeft <= 15 && (
          <button
            onClick={onSparkExtend}
            disabled={extending}
            className="flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-full px-4 py-2.5 transition-colors text-xs font-medium"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {extending ? "Extending..." : "+90s (1 token)"}
          </button>
        )}

        <button
          onClick={onSafeExit}
          className="flex items-center gap-2 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 rounded-full px-5 py-3 transition-colors text-sm font-medium"
        >
          <AlertTriangle className="w-4 h-4" />
          Safe Exit
        </button>

        <button
          onClick={onToggleVideo}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            isVideoOff ? "bg-destructive/20 text-destructive" : "bg-secondary text-secondary-foreground"
          }`}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};

export default CallControls;
