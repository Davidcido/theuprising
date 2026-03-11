import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, ChevronRight, Sparkles } from "lucide-react";
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

const PersonaSelector = ({ currentPersona, onSelect, userId }: PersonaSelectorProps) => {
  const [open, setOpen] = useState(false);
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

  const allPersonas: PersonaConfig[] = [
    ...BUILTIN_PERSONAS.map((p) => ({ ...p, is_custom: false, description: p.description })),
    ...customPersonas,
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors hover:bg-white/10"
        style={{ color: currentPersona.color }}
      >
        <span className="text-base">{currentPersona.avatar_emoji || "🤖"}</span>
        <span>{currentPersona.name}</span>
        <ChevronRight className={`w-3 h-3 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-1 w-72 rounded-2xl border border-white/15 bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden z-50"
          >
            {!showCreate ? (
              <>
                <div className="p-3 border-b border-white/10">
                  <p className="text-xs text-muted-foreground font-medium">Choose Your AI Persona</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">Persona = Who the AI is</p>
                </div>
                <div className="p-1.5 max-h-80 overflow-y-auto space-y-0.5">
                  {allPersonas.map((p) => {
                    const isActive = currentPersona.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          onSelect(p);
                          setOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                          isActive ? "bg-white/15" : "hover:bg-white/8"
                        }`}
                      >
                        <span className="text-xl shrink-0">{p.avatar_emoji || "🤖"}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                            {p.is_custom && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-muted-foreground">Custom</span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">{p.description}</p>
                        </div>
                        {isActive && <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />}
                      </button>
                    );
                  })}
                </div>
                {userId && (
                  <div className="p-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setShowCreate(true)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white/8 transition-colors"
                    >
                      <Sparkles className="w-4 h-4" />
                      Create Custom Persona
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">New Persona</p>
                  <button type="button" onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Persona name (e.g. Nova)"
                  className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-white/30"
                />
                <input
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="Role (e.g. life coach)"
                  className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-white/30"
                />
                <textarea
                  value={newPersonality}
                  onChange={(e) => setNewPersonality(e.target.value)}
                  placeholder="Personality traits (e.g. energetic, optimistic, confident)"
                  rows={2}
                  className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-white/30 resize-none"
                />
                <textarea
                  value={newStyle}
                  onChange={(e) => setNewStyle(e.target.value)}
                  placeholder="Conversation style (e.g. encouraging, uses metaphors)"
                  rows={2}
                  className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-white/30 resize-none"
                />
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!newName.trim() || creating}
                  className="w-full py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40 transition-opacity"
                  style={{ background: "linear-gradient(135deg, #2E8B57, #0F5132)" }}
                >
                  {creating ? "Creating..." : "Create Persona"}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PersonaSelector;
