import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

const moods = [
  { emoji: "😊", label: "Good", message: "That's wonderful! Let's keep that energy going." },
  { emoji: "😐", label: "Okay", message: "That's totally fine. Want to talk about what's on your mind?" },
  { emoji: "😔", label: "Low", message: "I'm here for you. Let's work through this together." },
  { emoji: "😰", label: "Stressed", message: "Take a deep breath. You've got this, and I'm right here." },
];

const DailyCheckIn = () => {
  const [selected, setSelected] = useState<number | null>(null);
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="max-w-xl mx-auto p-8 rounded-3xl backdrop-blur-xl border border-white/15 text-center shadow-lg"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 100%)",
      }}
    >
      <h3 className="text-2xl font-display font-bold text-white mb-2">
        How are you feeling today?
      </h3>
      <p className="text-white/50 text-sm mb-6">
        Be honest — there's no wrong answer here.
      </p>

      <div className="flex justify-center gap-4 mb-6">
        {moods.map((mood, i) => (
          <button
            key={mood.label}
            onClick={() => setSelected(i)}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl backdrop-blur-md border-2 transition-all ${
              selected === i
                ? "border-white/40 bg-white/20 scale-105"
                : "border-white/10 bg-white/5 hover:bg-white/10"
            }`}
          >
            <span className="text-3xl">{mood.emoji}</span>
            <span className="text-xs font-medium text-white/80">{mood.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {selected !== null && (
          <motion.div
            key={selected}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <p className="text-white/90 font-medium">{moods[selected].message}</p>
            <button
              onClick={() => navigate("/chat")}
              className="px-6 py-3 rounded-2xl text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg"
              style={{ background: "linear-gradient(135deg, #2E8B57, #0F5132)" }}
            >
              Talk to me about it →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DailyCheckIn;
