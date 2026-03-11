import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, Sparkles, ArrowRight } from "lucide-react";
import { BUILTIN_PERSONAS, type BuiltinPersona } from "@/lib/builtinPersonas";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type PersonaConfig = {
  id: string;
  name: string;
  meaning?: string;
  role: string;
  personality: string;
  conversation_style: string;
  emotional_tone: string;
  interests: string;
  avatar_emoji?: string;
  avatar_image?: string;
  avatar_url?: string | null;
  color: string;
  description: string;
  greeting?: string;
  is_custom?: boolean;
};

type PersonaSelectorProps = {
  currentPersona: PersonaConfig;
  onSelect: (persona: PersonaConfig) => void;
  userId?: string | null;
};

const SELECTED_COMPANION_KEY = "uprising_selected_companion";

export function getSavedCompanionId(): string | null {
  return localStorage.getItem(SELECTED_COMPANION_KEY);
}

export function saveCompanionId(id: string) {
  localStorage.setItem(SELECTED_COMPANION_KEY, id);
}

const PersonaSelector = ({ currentPersona, onSelect, userId }: PersonaSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [profilePersona, setProfilePersona] = useState<PersonaConfig | null>(null);
  const [customPersonas, setCustomPersonas] = useState<PersonaConfig[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newPersonality, setNewPersonality] = useState("");
  const [newStyle, setNewStyle] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("ai_personas")
      .select("*")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (data) {
          setCustomPersonas(
            data.map((p: any) => ({
              id: p.id,
              name: p.name,
              role: p.role,
              personality: p.personality,
              conversation_style: p.conversation_style || "",
              emotional_tone: p.emotional_tone || "warm",
              interests: p.interests || "",
              avatar_url: p.avatar_url,
              avatar_emoji: "🤖",
              color: "#6B7280",
              description: p.role,
              is_custom: true,
            }))
          );
        }
      });
  }, [userId]);

  const handleCreate = async () => {
    if (!newName.trim() || !userId) return;
    setCreating(true);
    const { data, error } = await supabase.from("ai_personas").insert({
      user_id: userId,
      name: newName.trim(),
      role: newRole.trim() || "companion",
      personality: newPersonality.trim(),
      conversation_style: newStyle.trim(),
    }).select().single();

    if (error) {
      toast.error("Could not create persona");
    } else if (data) {
      const persona: PersonaConfig = {
        id: data.id,
        name: data.name,
        role: data.role,
        personality: data.personality,
        conversation_style: data.conversation_style || "",
        emotional_tone: data.emotional_tone || "warm",
        interests: data.interests || "",
        avatar_emoji: "🤖",
        color: "#6B7280",
        description: data.role,
        is_custom: true,
      };
      setCustomPersonas((prev) => [...prev, persona]);
      saveCompanionId(data.id);
      onSelect(persona);
      toast.success(`${data.name} created! 🎉`);
      setShowCreate(false);
      setOpen(false);
      setNewName("");
      setNewRole("");
      setNewPersonality("");
      setNewStyle("");
    }
    setCreating(false);
  };

  const handleSelectFromProfile = (p: PersonaConfig) => {
    saveCompanionId(p.id);
    onSelect(p);
    setProfilePersona(null);
    setOpen(false);
  };

  const allPersonas: PersonaConfig[] = [
    ...BUILTIN_PERSONAS.map((p) => ({ ...p, is_custom: false })),
    ...customPersonas,
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-white/10"
        style={{ color: currentPersona.color }}
      >
        <ChevronLeft className={`w-3 h-3 transition-transform ${open ? "-rotate-90" : ""}`} />
        <span className="text-muted-foreground">Switch</span>
      </button>

      <AnimatePresence>
        {open && !profilePersona && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-background/98 backdrop-blur-xl flex flex-col"
          >
            {/* Header */}
            <div className="px-5 pt-6 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-display font-bold text-foreground">Choose Your Companion</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Each companion has their own personality and perspective</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-xl hover:bg-white/10 text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Companion Grid */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {!showCreate ? (
                <div className="grid grid-cols-2 gap-3">
                  {allPersonas.map((p) => {
                    const isActive = currentPersona.id === p.id;
                    const builtinData = BUILTIN_PERSONAS.find(bp => bp.id === p.id);
                    return (
                      <motion.button
                        key={p.id}
                        type="button"
                        onClick={() => setProfilePersona(p)}
                        whileTap={{ scale: 0.97 }}
                        className={`relative flex flex-col items-center text-center p-4 rounded-2xl border transition-all ${
                          isActive
                            ? "border-white/30 bg-white/10"
                            : "border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20"
                        }`}
                      >
                        {/* Avatar */}
                        <div className="w-16 h-16 rounded-full overflow-hidden mb-3 ring-2 ring-offset-2 ring-offset-background" style={{ ringColor: p.color }}>
                          {builtinData?.avatar_image ? (
                            <img src={builtinData.avatar_image} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl" style={{ background: `${p.color}22` }}>
                              {p.avatar_emoji || "🤖"}
                            </div>
                          )}
                        </div>
                        {/* Name & Emoji */}
                        <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                          {p.avatar_emoji} {p.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-tight">{p.description}</p>
                        {isActive && (
                          <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                        )}
                        {p.is_custom && (
                          <span className="absolute top-2 left-2 text-[8px] px-1.5 py-0.5 rounded-full bg-white/10 text-muted-foreground">Custom</span>
                        )}
                      </motion.button>
                    );
                  })}

                  {/* Create Custom Card */}
                  {userId && (
                    <motion.button
                      type="button"
                      onClick={() => setShowCreate(true)}
                      whileTap={{ scale: 0.97 }}
                      className="flex flex-col items-center justify-center p-4 rounded-2xl border border-dashed border-white/20 hover:border-white/30 hover:bg-white/5 transition-all"
                    >
                      <Sparkles className="w-8 h-8 text-muted-foreground mb-2" />
                      <p className="text-xs font-medium text-muted-foreground">Create Custom</p>
                    </motion.button>
                  )}
                </div>
              ) : (
                /* Create Form */
                <div className="max-w-sm mx-auto space-y-3 pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <button type="button" onClick={() => setShowCreate(false)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                    <p className="text-sm font-medium text-foreground">New Companion</p>
                  </div>
                  <input
                    value={newName} onChange={(e) => setNewName(e.target.value)}
                    placeholder="Name (e.g. Nova)"
                    className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-white/30"
                  />
                  <input
                    value={newRole} onChange={(e) => setNewRole(e.target.value)}
                    placeholder="Role (e.g. life coach)"
                    className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-white/30"
                  />
                  <textarea
                    value={newPersonality} onChange={(e) => setNewPersonality(e.target.value)}
                    placeholder="Personality traits"
                    rows={2}
                    className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-white/30 resize-none"
                  />
                  <textarea
                    value={newStyle} onChange={(e) => setNewStyle(e.target.value)}
                    placeholder="Conversation style"
                    rows={2}
                    className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-white/30 resize-none"
                  />
                  <button
                    type="button" onClick={handleCreate}
                    disabled={!newName.trim() || creating}
                    className="w-full py-3 rounded-xl text-sm font-medium text-white disabled:opacity-40 transition-opacity"
                    style={{ background: "linear-gradient(135deg, #2E8B57, #0F5132)" }}
                  >
                    {creating ? "Creating..." : "Create Companion"}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Character Profile Page */}
        {open && profilePersona && (
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-background/98 backdrop-blur-xl flex flex-col"
          >
            {/* Profile Hero */}
            <div className="relative flex flex-col items-center pt-8 pb-6 px-6">
              <button
                onClick={() => setProfilePersona(null)}
                className="absolute top-4 left-4 p-2 rounded-xl hover:bg-white/10 text-muted-foreground"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Large Avatar */}
              <div
                className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-offset-4 ring-offset-background shadow-2xl mb-5"
                style={{ boxShadow: `0 0 60px ${profilePersona.color}40`, borderColor: `${profilePersona.color}66` }}
              >
                {(() => {
                  const builtinData = BUILTIN_PERSONAS.find(bp => bp.id === profilePersona.id);
                  return builtinData?.avatar_image ? (
                    <img src={builtinData.avatar_image} alt={profilePersona.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl" style={{ background: `${profilePersona.color}22` }}>
                      {profilePersona.avatar_emoji || "🤖"}
                    </div>
                  );
                })()}
              </div>

              <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
                {profilePersona.avatar_emoji} {profilePersona.name}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">{profilePersona.role}</p>
            </div>

            {/* Profile Details */}
            <div className="flex-1 overflow-y-auto px-6 pb-32 space-y-6">
              {/* Meaning */}
              {profilePersona.meaning && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Name Meaning</p>
                  <p className="text-sm text-foreground leading-relaxed italic">"{profilePersona.meaning}"</p>
                </div>
              )}

              {/* Personality */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Personality</p>
                <p className="text-sm text-foreground leading-relaxed">{profilePersona.personality}</p>
              </div>

              {/* Description */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">About</p>
                <p className="text-sm text-foreground leading-relaxed">{profilePersona.description}</p>
              </div>

              {/* Conversation Style */}
              {profilePersona.conversation_style && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Conversation Style</p>
                  <p className="text-sm text-foreground leading-relaxed">{profilePersona.conversation_style}</p>
                </div>
              )}
            </div>

            {/* Bottom Buttons */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-xl border-t border-white/10 flex gap-3 z-50">
              <button
                type="button"
                onClick={() => setProfilePersona(null)}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-muted-foreground border border-white/20 hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSelectFromProfile(profilePersona)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                style={{ background: `linear-gradient(135deg, ${profilePersona.color}, ${profilePersona.color}CC)` }}
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

export default PersonaSelector;
