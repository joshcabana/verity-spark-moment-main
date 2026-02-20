import { motion, AnimatePresence } from "framer-motion";
import { Shield } from "lucide-react";

interface SafeExitModalProps {
  visible: boolean;
  onExit: () => void;
  onCancel: () => void;
}

const SafeExitModal = ({ visible, onExit, onCancel }: SafeExitModalProps) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center px-6"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="glass-card rounded-2xl p-6 max-w-sm w-full text-center"
          >
            <Shield className="w-10 h-10 text-primary mx-auto mb-4" />
            <h3 className="font-display text-xl font-semibold text-foreground mb-2">Safe Exit</h3>
            <p className="text-muted-foreground text-sm mb-6">
              This will end the call immediately. The other person won't know why.
              You can optionally report the call for review.
            </p>
            <div className="space-y-2">
              <button onClick={onExit} className="w-full bg-destructive text-destructive-foreground font-medium py-3 rounded-xl">
                Exit & Report
              </button>
              <button onClick={onExit} className="w-full bg-secondary text-secondary-foreground font-medium py-3 rounded-xl">
                Exit Without Reporting
              </button>
              <button onClick={onCancel} className="w-full text-muted-foreground font-medium py-3">
                Stay in Call
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SafeExitModal;
