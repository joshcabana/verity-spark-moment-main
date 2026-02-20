import { motion } from "framer-motion";

interface TimerRingProps {
  timeLeft: number;
  maxTime: number;
}

const TimerRing = ({ timeLeft, maxTime }: TimerRingProps) => {
  const progress = ((maxTime - Math.min(timeLeft, maxTime)) / maxTime) * 100;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center"
    >
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--border))" strokeWidth="3" />
          <circle
            cx="50" cy="50" r="45" fill="none"
            stroke={timeLeft <= 10 ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
            strokeWidth="3" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 linear"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xl font-bold font-sans ${timeLeft <= 10 ? "text-destructive" : "text-foreground"}`}>
            {timeLeft}
          </span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground mt-1">seconds</span>
    </motion.div>
  );
};

export default TimerRing;
