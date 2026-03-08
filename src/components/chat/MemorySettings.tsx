import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Trash2, ChevronDown, ChevronUp, X } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
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
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleToggle = (checked: boolean) => {
    if (!checked && memoryEnabled) {
      setShowDisableDialog(true);
    } else if (checked && !memoryEnabled) {
      onToggle(true).then(() => toast.success("AI Memory enabled 💚"));
    }
  };

  const confirmDisable = async () => {
    setProcessing(true);
    await onDisableAndClear();
    setProcessing(false);
    setShowDisableDialog(false);
    toast.success("AI Memory disabled and memories cleared");
  };

  const confirmClear = async () => {
    setProcessing(true);
    await onClear();
    setProcessing(false);
    setShowClearDialog(false);
    toast.success("All memories cleared");
  };

  return (
    <>
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
            <Switch
              checked={!!memoryEnabled}
              onCheckedChange={handleToggle}
            />
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
                onClick={() => setShowClearDialog(true)}
                className="text-xs text-destructive/80 hover:text-destructive flex items-center gap-1 transition-colors"
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
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0 mt-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Disable Memory Confirmation */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Turn off AI Memory?</AlertDialogTitle>
            <AlertDialogDescription>
              Turning off memory will delete all saved memories and the AI will stop remembering details from your conversations. You can enable it again later to start fresh.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDisable}
              disabled={processing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing ? "Turning off…" : "Turn Off Memory"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear All Memories Confirmation */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all memories?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all saved memories. The AI will continue remembering new details from future conversations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClear}
              disabled={processing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing ? "Clearing…" : "Clear All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MemorySettings;
