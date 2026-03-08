import { motion } from "framer-motion";
import { Brain, ShieldCheck } from "lucide-react";

interface MemoryChoicePromptProps {
  onChoose: (enabled: boolean) => void;
}

const MemoryChoicePrompt = ({ onChoose }: MemoryChoicePromptProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-md"
    >
      <div
        className="rounded-2xl p-6 backdrop-blur-xl border border-white/15 space-y-4"
        style={{ background: "linear-gradient(135deg, rgba(15,81,50,0.3), rgba(46,139,87,0.15))" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-display font-semibold text-foreground">AI Memory</h3>
        </div>

        <p className="text-sm text-foreground/80 leading-relaxed">
          To better support you, I can remember helpful details from our conversations — like your goals, preferences, and things you share. This helps me give more personalized responses over time. 💚
        </p>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>You can change this anytime in your profile settings.</span>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={() => onChoose(true)}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #2E8B57, #0F5132)" }}
          >
            Enable Memory
          </button>
          <button
            onClick={() => onChoose(false)}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-foreground/70 bg-white/10 border border-white/20 hover:bg-white/15 transition-colors"
          >
            Chat Without Memory
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default MemoryChoicePrompt;
