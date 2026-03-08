import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, X } from "lucide-react";
import { toast } from "sonner";
import type { AIMemory } from "@/hooks/useAIMemory";

interface MemorySettingsProps {
  memoryEnabled: boolean | null;
  memories: AIMemory[];
  onToggle: (enabled: boolean) => Promise<any>;
  onClear: () => Promise<void>;
  onDeleteMemory: (id: string) => Promise<void>;
  onDisableAndClear: () => Promise<void>;
}

const MemorySettings = ({
  memoryEnabled,
  memories,
  onToggle,
  onClear,
  onDeleteMemory,
  onDisableAndClear,
}: MemorySettingsProps) => {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState<"clear" | "disable" | null>(null);

  const handleToggle = async () => {
    if (memoryEnabled) {
      setConfirming("disable");
    } else {
      await onToggle(true);
      toast.success("AI Memory enabled 💚");
    }
  };

  const confirmDisable = async () => {
    await onDisableAndClear();
    setConfirming(null);
    toast.success("AI Memory disabled and memories cleared");
  };

  const confirmClear = async () => {
    await onClear();
    setConfirming(null);
    toast.success("All memories cleared");
  };

  return (
    <div
      className="rounded-2xl backdrop-blur-xl border border-white/15 overflow-hidden"
      style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))" }}
    >
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-foreground text-sm">AI Memory</h3>
              <p className="text-xs text-muted-foreground">
                {memoryEnabled ? `${memories.length} memories saved` : "Disabled"}
              </p>
            </div>
          </div>
          <button onClick={handleToggle} className="text-foreground/70 hover:text-foreground transition-colors">
            {memoryEnabled ? (
              <ToggleRight className="w-8 h-8 text-primary" />
            ) : (
              <ToggleLeft className="w-8 h-8 text-muted-foreground" />
            )}
          </button>
        </div>

        {memoryEnabled && memories.length > 0 && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-primary/80 hover:text-primary flex items-center gap-1 transition-colors"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? "Hide" : "View"} memories
            </button>
            <button
              onClick={() => setConfirming("clear")}
              className="text-xs text-red-400/80 hover:text-red-400 flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Clear all
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {expanded && memories.length > 0 && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2 max-h-60 overflow-y-auto">
              {memories.map((m) => (
                <div key={m.id} className="flex items-start gap-2 p-2 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-xs text-foreground/80 flex-1">{m.memory_text}</span>
                  <button
                    onClick={() => onDeleteMemory(m.id)}
                    className="text-muted-foreground hover:text-red-400 transition-colors shrink-0 mt-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation dialogs */}
      <AnimatePresence>
        {confirming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 pb-4"
          >
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 space-y-2">
              <p className="text-xs text-foreground/80">
                {confirming === "disable"
                  ? "Disabling memory will delete all saved memories. Continue?"
                  : "Clear all saved memories? This cannot be undone."}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={confirming === "disable" ? confirmDisable : confirmClear}
                  className="text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirming(null)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-foreground/70 hover:bg-white/15 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MemorySettings;
