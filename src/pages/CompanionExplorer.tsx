import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ArrowRight, Sparkles } from "lucide-react";
import { BUILTIN_PERSONAS, type BuiltinPersona } from "@/lib/builtinPersonas";
import { saveCompanionId } from "@/components/chat/PersonaSelector";

const CompanionExplorer = () => {
  const navigate = useNavigate();
  const [selectedProfile, setSelectedProfile] = useState<BuiltinPersona | null>(null);

  const handleSelect = (persona: BuiltinPersona) => {
    saveCompanionId(persona.id);
    navigate("/chat", { state: { newCompanionId: persona.id } });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      <AnimatePresence mode="wait">
        {!selectedProfile ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col flex-1"
          >
            {/* Header */}
            <div className="px-5 pt-6 pb-4">
              <button
                onClick={() => navigate("/chat")}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
              >
                <ChevronLeft className="w-4 h-4" /> Back to Chat
              </button>
              <h1 className="text-xl font-display font-bold text-foreground">
                Choose Your Companion
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Each companion has their own personality and perspective.
              </p>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto px-4 pb-8">
              <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
                {BUILTIN_PERSONAS.map((p) => (
                  <motion.button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProfile(p)}
                    whileTap={{ scale: 0.97 }}
                    className="relative flex flex-col items-center text-center p-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20 transition-all"
                  >
                    <div
                      className="w-16 h-16 rounded-full overflow-hidden mb-3 ring-2 ring-offset-2 ring-offset-background"
                      style={{ borderColor: p.color }}
                    >
                      <img src={p.avatar_image} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {p.name}
                    </p>
                    <p className="text-[11px] font-medium mt-0.5" style={{ color: p.color }}>
                      {p.roleTitle}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-tight italic">
                      "{p.tagline}"
                    </p>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className="flex flex-col flex-1"
          >
            {/* Profile Hero */}
            <div className="relative flex flex-col items-center pt-8 pb-6 px-6">
              <button
                onClick={() => setSelectedProfile(null)}
                className="absolute top-4 left-4 p-2 rounded-xl hover:bg-white/10 text-muted-foreground"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div
                className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-offset-4 ring-offset-background shadow-2xl mb-5"
                style={{
                  boxShadow: `0 0 60px ${selectedProfile.color}40`,
                  borderColor: `${selectedProfile.color}66`,
                }}
              >
                <img
                  src={selectedProfile.avatar_image}
                  alt={selectedProfile.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
                {selectedProfile.avatar_emoji} {selectedProfile.name}
              </h2>
              <p className="text-sm font-medium mt-1" style={{ color: selectedProfile.color }}>{selectedProfile.roleTitle}</p>
              <p className="text-xs text-muted-foreground mt-0.5 italic">"{selectedProfile.tagline}"</p>
            </div>

            {/* Profile Details */}
            <div className="flex-1 overflow-y-auto px-6 pb-32 space-y-6">
              {selectedProfile.meaning && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Name Meaning
                  </p>
                  <p className="text-sm text-foreground leading-relaxed italic">
                    "{selectedProfile.meaning}"
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Personality
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  {selectedProfile.personality}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  About
                </p>
                <p className="text-sm text-foreground leading-relaxed">
                  {selectedProfile.description}
                </p>
              </div>

              {selectedProfile.conversation_style && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Conversation Style
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">
                    {selectedProfile.conversation_style}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Buttons */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-xl border-t border-white/10 flex gap-3 z-50">
              <button
                type="button"
                onClick={() => setSelectedProfile(null)}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-muted-foreground border border-white/20 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSelect(selectedProfile)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                style={{
                  background: `linear-gradient(135deg, ${selectedProfile.color}, ${selectedProfile.color}CC)`,
                }}
              >
                Select Companion <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CompanionExplorer;
