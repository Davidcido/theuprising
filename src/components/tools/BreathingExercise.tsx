import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const phases = ["inhale", "hold", "exhale"] as const;
type Phase = typeof phases[number] | "idle";

const BreathingExercise = () => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [count, setCount] = useState(0);
  const [cycle, setCycle] = useState(0);
  const totalCycles = 5;

  const phaseColors: Record<Phase, string> = {
    idle: "rgba(46,139,87,0.3)",
    inhale: "rgba(46,139,87,0.6)",
    hold: "rgba(15,81,50,0.6)",
    exhale: "rgba(207,245,231,0.4)",
  };

  const phaseScale: Record<Phase, number> = {
    idle: 1,
    inhale: 1.5,
    hold: 1.5,
    exhale: 1,
  };

  const start = useCallback(() => {
    setPhase("inhale");
    setCount(4);
    setCycle(0);
  }, []);

  useEffect(() => {
    if (phase === "idle") return;
    if (count > 0) {
      const t = setTimeout(() => setCount(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
    // Move to next phase
    if (phase === "inhale") { setPhase("hold"); setCount(4); }
    else if (phase === "hold") { setPhase("exhale"); setCount(4); }
    else if (phase === "exhale") {
      if (cycle + 1 >= totalCycles) { setPhase("idle"); }
      else { setCycle(c => c + 1); setPhase("inhale"); setCount(4); }
    }
  }, [phase, count, cycle]);

  return (
    <div className="flex flex-col items-center space-y-8 py-4">
      <motion.div
        animate={{
          scale: phaseScale[phase],
          backgroundColor: phaseColors[phase],
        }}
        transition={{ duration: phase === "idle" ? 0.3 : 3.5, ease: "easeInOut" }}
        className="w-36 h-36 rounded-full flex items-center justify-center shadow-lg"
        style={{ boxShadow: "0 0 60px rgba(46,139,87,0.3)" }}
      >
        <span className="text-3xl font-display font-bold text-white">
          {phase === "idle" ? "🫁" : count}
        </span>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.p
          key={phase}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-white/90 font-display font-semibold text-lg capitalize"
        >
          {phase === "idle" ? "Ready to breathe?" : phase}
        </motion.p>
      </AnimatePresence>

      {phase !== "idle" && (
        <div className="flex gap-1.5">
          {Array.from({ length: totalCycles }).map((_, i) => (
            <div key={i} className={`w-2.5 h-2.5 rounded-full transition-colors ${i <= cycle ? "bg-white" : "bg-white/20"}`} />
          ))}
        </div>
      )}

      {phase === "idle" && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={start}
          className="px-8 py-3 rounded-2xl font-display font-semibold text-sm shadow-lg"
          style={{ background: "linear-gradient(135deg, #0F5132, #2E8B57)", color: "white" }}
        >
          Start Breathing
        </motion.button>
      )}
    </div>
  );
};

export default BreathingExercise;
