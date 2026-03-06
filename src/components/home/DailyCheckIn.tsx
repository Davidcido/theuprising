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
      className="max-w-xl mx-auto p-8 rounded-3xl bg-card border border-border shadow-soft text-center"
    >
      <h3 className="text-2xl font-display font-bold text-foreground mb-2">
        How are you feeling today?
      </h3>
      <p className="text-muted-foreground text-sm mb-6">
        Be honest — there's no wrong answer here.
      </p>

      <div className="flex justify-center gap-4 mb-6">
        {moods.map((mood, i) => (
          <button
            key={mood.label}
            onClick={() => setSelected(i)}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
              selected === i
                ? "border-primary bg-uprising-green-light scale-105"
                : "border-transparent bg-secondary hover:bg-secondary/80"
            }`}
          >
            <span className="text-3xl">{mood.emoji}</span>
            <span className="text-xs font-medium text-foreground">{mood.label}</span>
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
            <p className="text-foreground font-medium">{moods[selected].message}</p>
            <button
              onClick={() => navigate("/chat")}
              className="px-6 py-3 rounded-xl bg-gradient-hero text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
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
