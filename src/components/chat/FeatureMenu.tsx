import { useState } from "react";
import { 
  MessageCircle, Brain, Lightbulb, BookOpen, Heart, Search, 
  Plus, X 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type ChatMode = "companion" | "thinking" | "creative" | "study" | "vent" | "search";

const modes: { id: ChatMode; label: string; icon: React.ElementType; description: string }[] = [
  { id: "companion", label: "Companion", icon: MessageCircle, description: "Emotional support & chat" },
  { id: "thinking", label: "Thinking", icon: Brain, description: "Deep analysis & reasoning" },
  { id: "creative", label: "Creative", icon: Lightbulb, description: "Writing & brainstorming" },
  { id: "study", label: "Study", icon: BookOpen, description: "Learn & explain topics" },
  { id: "vent", label: "Vent Mode", icon: Heart, description: "Just listen & support" },
  { id: "search", label: "Web Search", icon: Search, description: "Search for information" },
];

type FeatureMenuProps = {
  currentMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
};

const FeatureMenu = ({ currentMode, onModeChange }: FeatureMenuProps) => {
  const [open, setOpen] = useState(false);
  const currentModeData = modes.find(m => m.id === currentMode);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
      >
        {open ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-12 left-0 w-64 rounded-2xl border border-white/15 bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50"
          >
            <div className="p-2 border-b border-white/10">
              <p className="text-xs text-muted-foreground px-2 py-1 font-medium">Conversation Style</p>
              <p className="text-[10px] text-muted-foreground/60 px-2">How the AI responds</p>
            </div>
            <div className="p-1.5 space-y-0.5">
              {modes.map((mode) => {
                const Icon = mode.icon;
                const isActive = currentMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      onModeChange(mode.id);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                      isActive 
                        ? "bg-primary/20 text-primary" 
                        : "text-foreground/80 hover:bg-white/10"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{mode.label}</p>
                      <p className="text-xs text-muted-foreground">{mode.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {currentMode !== "companion" && (
        <div className="absolute -top-8 left-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 border border-primary/30 whitespace-nowrap">
          {currentModeData && <currentModeData.icon className="w-3 h-3 text-primary" />}
          <span className="text-[10px] text-primary font-medium">{currentModeData?.label}</span>
        </div>
      )}
    </div>
  );
};

export default FeatureMenu;
