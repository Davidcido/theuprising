import { useState } from "react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";

const GratitudeReflection = () => {
  const [items, setItems] = useState<string[]>([]);
  const [input, setInput] = useState("");

  const add = () => {
    if (input.trim()) {
      setItems([...items, input.trim()]);
      setInput("");
    }
  };

  return (
    <div className="space-y-4 py-2">
      <p className="text-white/70 text-sm">List 3 things you're grateful for today.</p>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="I'm grateful for..."
          className="flex-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
        />
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={add}
          className="px-4 py-3 rounded-xl text-sm font-medium text-white"
          style={{ background: "linear-gradient(135deg, #0F5132, #2E8B57)" }}
        >
          Add
        </motion.button>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/15"
          >
            <Heart className="w-4 h-4 text-white/80 flex-shrink-0" fill="currentColor" />
            <span className="text-sm text-white/90">{item}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default GratitudeReflection;
