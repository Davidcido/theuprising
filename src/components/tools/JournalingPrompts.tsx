import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";

const prompts = [
  "What emotion am I feeling most strongly right now?",
  "What would I say to a friend going through the same thing?",
  "What is one small thing that brought me comfort today?",
  "What do I need to let go of?",
  "If my feelings had a color, what would it be and why?",
  "What am I most grateful for in this moment?",
  "What boundaries do I need to set for my peace?",
];

const JournalingPrompts = () => {
  const [current, setCurrent] = useState(0);

  return (
    <div className="text-center space-y-6 py-2">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="p-6 rounded-2xl backdrop-blur-md bg-white/10 border border-white/15"
        >
          <p className="text-lg font-medium text-white italic leading-relaxed">
            "{prompts[current]}"
          </p>
        </motion.div>
      </AnimatePresence>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setCurrent((c) => (c + 1) % prompts.length)}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-display font-semibold text-sm bg-white/15 text-white backdrop-blur-md border border-white/20"
      >
        Next Prompt <ChevronRight className="w-4 h-4" />
      </motion.button>
    </div>
  );
};

export default JournalingPrompts;
