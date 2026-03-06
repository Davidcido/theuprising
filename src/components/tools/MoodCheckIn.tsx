import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const moods = [
  { emoji: "😊", label: "Good", color: "#2E8B57" },
  { emoji: "😐", label: "Okay", color: "#6B8E6B" },
  { emoji: "😔", label: "Low", color: "#4A6741" },
  { emoji: "😰", label: "Stressed", color: "#8B6914" },
];

const MoodCheckIn = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSelect = (label: string) => {
    setSelected(label);
    setTimeout(() => navigate("/chat"), 800);
  };

  return (
    <div className="space-y-6 py-2">
      <p className="text-white/80 text-sm text-center">How are you feeling right now?</p>
      <div className="grid grid-cols-2 gap-3">
        {moods.map((m) => (
          <motion.button
            key={m.label}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSelect(m.label)}
            className={`flex flex-col items-center gap-2 p-5 rounded-2xl backdrop-blur-md border transition-all ${
              selected === m.label ? "border-white/50 bg-white/20" : "border-white/10 bg-white/5"
            }`}
          >
            <span className="text-3xl">{m.emoji}</span>
            <span className="text-sm font-medium text-white/90">{m.label}</span>
          </motion.button>
        ))}
      </div>
      {selected && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-white/70 text-sm"
        >
          Taking you to your companion...
        </motion.p>
      )}
    </div>
  );
};

export default MoodCheckIn;
