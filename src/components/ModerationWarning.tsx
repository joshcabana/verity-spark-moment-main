import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface ModerationWarningProps {
  visible: boolean;
  category?: string;
  onDismiss: () => void;
}

const ModerationWarning = ({ visible, category, onDismiss }: ModerationWarningProps) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute bottom-32 left-4 right-4 z-40"
        >
          <div className="bg-amber-500/15 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-amber-300">Keep it respectful</p>
            <p className="text-xs text-amber-400/70 mt-1">
              {category === "nudity" && "Inappropriate content detected."}
              {category === "harassment" && "Aggressive behavior detected."}
              {category === "inappropriate_gesture" && "Please keep gestures appropriate."}
              {!category && "Please follow community guidelines."}
            </p>
            <button
              onClick={onDismiss}
              className="mt-3 text-xs text-amber-400 underline"
            >
              Understood
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ModerationWarning;
