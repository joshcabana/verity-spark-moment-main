import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Clock3, Sparkles, Users } from "lucide-react";

type SparkCallInterfaceProps = {
  durationSeconds?: number;
  revealSecond?: number;
  className?: string;
};

type Phase = "anonymous" | "converge" | "revealed";

const SparkCallInterface = ({
  durationSeconds = 45,
  revealSecond = 15,
  className = "",
}: SparkCallInterfaceProps) => {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);
  const [phase, setPhase] = useState<Phase>("anonymous");
  const [burstVisible, setBurstVisible] = useState(false);

  const circumference = 2 * Math.PI * 58;
  const progress = secondsLeft / durationSeconds;
  const dashOffset = circumference * (1 - progress);

  const confettiPieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, index) => ({
        id: index,
        x: -110 + Math.random() * 220,
        delay: Math.random() * 0.45,
        rotation: -180 + Math.random() * 360,
        color: Math.random() > 0.5 ? "#34d399" : "#d946ef",
      })),
    []
  );

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const intervalId = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [secondsLeft]);

  useEffect(() => {
    if (secondsLeft === revealSecond && phase === "anonymous") {
      setPhase("converge");
      setBurstVisible(true);

      const revealTimer = window.setTimeout(() => {
        setPhase("revealed");
      }, 1200);

      const hideBurst = window.setTimeout(() => {
        setBurstVisible(false);
      }, 1800);

      return () => {
        window.clearTimeout(revealTimer);
        window.clearTimeout(hideBurst);
      };
    }

    return undefined;
  }, [phase, revealSecond, secondsLeft]);

  const resetDemo = () => {
    setSecondsLeft(durationSeconds);
    setPhase("anonymous");
    setBurstVisible(false);
  };

  const subtitle =
    phase === "anonymous"
      ? "Anonymous 45-second spark in progress"
      : phase === "converge"
        ? "Orb convergence: identity reveal arming"
        : "Mutual reveal unlocked. Confetti burst active.";

  return (
    <section
      aria-label="Spark Call cinematic interface"
      className={`relative overflow-hidden rounded-3xl border border-white/15 bg-black/50 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl ${className}`}
    >
      <div className="absolute -left-20 top-0 h-48 w-48 rounded-full bg-[#34d399]/20 blur-3xl" aria-hidden="true" />
      <div className="absolute -right-20 bottom-0 h-48 w-48 rounded-full bg-[#d946ef]/20 blur-3xl" aria-hidden="true" />

      <div className="relative z-10 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/65">
        <span className="inline-flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-[#34d399]" />
          Live Spark Call
        </span>
        <span className="inline-flex items-center gap-2">
          <Clock3 className="h-3.5 w-3.5 text-[#d946ef]" />
          {secondsLeft}s
        </span>
      </div>

      <div className="relative mt-6 grid place-items-center">
        <svg viewBox="0 0 140 140" className="h-44 w-44" role="img" aria-label={`${secondsLeft} seconds left`}>
          <defs>
            <linearGradient id="spark-ring" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#d946ef" />
            </linearGradient>
          </defs>
          <circle cx="70" cy="70" r="58" stroke="rgba(255,255,255,0.16)" strokeWidth="8" fill="none" />
          <circle
            cx="70"
            cy="70"
            r="58"
            stroke="url(#spark-ring)"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
            transform="rotate(-90 70 70)"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>

        <div className="absolute inset-0 grid place-items-center">
          <div className="rounded-2xl border border-white/10 bg-black/40 px-6 py-4 text-center backdrop-blur">
            <p className="font-display text-3xl font-bold text-white">{secondsLeft}s</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/60">
              {phase === "revealed" ? "Reveal live" : "Chemistry scan"}
            </p>
          </div>
        </div>

        <AnimatePresence>
          {phase === "converge" && (
            <>
              <motion.span
                key="orb-left"
                className="absolute left-[22%] h-10 w-10 rounded-full bg-[#34d399] shadow-[0_0_40px_rgba(52,211,153,0.85)]"
                initial={{ x: 0, opacity: 0.9, scale: 1 }}
                animate={{ x: 38, opacity: 1, scale: 1.1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: "easeInOut" }}
              />
              <motion.span
                key="orb-right"
                className="absolute right-[22%] h-10 w-10 rounded-full bg-[#d946ef] shadow-[0_0_40px_rgba(217,70,239,0.85)]"
                initial={{ x: 0, opacity: 0.9, scale: 1 }}
                animate={{ x: -38, opacity: 1, scale: 1.1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: "easeInOut" }}
              />
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {burstVisible && (
            <motion.span
              key="reveal-flash"
              className="absolute inset-0 rounded-full bg-white/80 mix-blend-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.9, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase === "revealed" && (
            <>
              {confettiPieces.map((piece) => (
                <motion.span
                  key={piece.id}
                  className="absolute left-1/2 top-[38%] h-2.5 w-1.5 rounded"
                  style={{ backgroundColor: piece.color }}
                  initial={{ opacity: 0, x: 0, y: 0, rotate: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    x: piece.x,
                    y: 140,
                    rotate: piece.rotation,
                  }}
                  transition={{ duration: 1.6, delay: piece.delay, ease: "easeOut" }}
                />
              ))}
            </>
          )}
        </AnimatePresence>
      </div>

      <div className="relative z-10 mt-6 rounded-2xl border border-white/10 bg-black/35 p-4">
        <p className="text-sm text-white/90">{subtitle}</p>
        <div className="mt-3 flex items-center justify-between text-xs text-white/70">
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-[#34d399]" />
            Orb explosion at 15s
          </span>
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#d946ef]" />
            Mutual reveal protocol
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={resetDemo}
        className="relative z-10 mt-5 inline-flex rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 transition-colors hover:bg-white/10"
      >
        Replay Spark demo
      </button>
    </section>
  );
};

export default SparkCallInterface;
