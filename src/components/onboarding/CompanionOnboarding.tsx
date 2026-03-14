import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Heart, Brain, Zap, BookOpen, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PURPOSES = [
  { id: "emotional", label: "Emotional support", icon: Heart },
  { id: "deep", label: "Deep conversations", icon: Brain },
  { id: "motivation", label: "Motivation & productivity", icon: Zap },
  { id: "reflection", label: "Life reflection", icon: BookOpen },
  { id: "casual", label: "Casual conversation", icon: MessageCircle },
];

const STYLES = [
  { id: "calm", label: "Calm and supportive", desc: "Gentle, patient, soothing" },
  { id: "curious", label: "Curious and thoughtful", desc: "Asks meaningful questions" },
  { id: "energetic", label: "Energetic and motivating", desc: "Upbeat, encouraging" },
  { id: "balanced", label: "Balanced", desc: "A mix of everything" },
];

const FEELINGS = [
  "Great", "Good", "Okay", "Stressed", "Anxious", "Sad", "Motivated", "Confused",
];

const slideVariants = {
  enter: { opacity: 0, x: 60 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -60 },
};

interface Props {
  onComplete: (data: {
    preferredName: string;
    lifeGoal: string;
    currentFeeling: string;
    purposes: string[];
    interactionStyle: string;
  }) => void;
}

const CompanionOnboarding = ({ onComplete }: Props) => {
  const [step, setStep] = useState(0);
  const [preferredName, setPreferredName] = useState("");
  const [lifeGoal, setLifeGoal] = useState("");
  const [currentFeeling, setCurrentFeeling] = useState("");
  const [selectedPurposes, setSelectedPurposes] = useState<string[]>([]);
  const [interactionStyle, setInteractionStyle] = useState("balanced");
  const [saving, setSaving] = useState(false);

  const togglePurpose = (id: string) => {
    setSelectedPurposes((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const next = () => setStep((s) => s + 1);

  const finish = () => {
    // Call onComplete IMMEDIATELY — no blocking
    onComplete({
      preferredName,
      lifeGoal,
      currentFeeling,
      purposes: selectedPurposes,
      interactionStyle,
    });

    // Run all DB writes in background
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fire all writes in parallel
        const memoriesToStore: { text: string; category: string; importance: number }[] = [];
        if (preferredName) memoriesToStore.push({ text: `User's preferred name is ${preferredName}`, category: "identity", importance: 10 });
        if (lifeGoal) memoriesToStore.push({ text: `Currently working toward: ${lifeGoal}`, category: "goals", importance: 8 });
        if (currentFeeling) memoriesToStore.push({ text: `Currently feeling: ${currentFeeling}`, category: "emotional", importance: 6 });
        if (selectedPurposes.length > 0) {
          const labels = selectedPurposes.map(id => PURPOSES.find(p => p.id === id)?.label || id).join(", ");
          memoriesToStore.push({ text: `Wants companions for: ${labels}`, category: "preferences", importance: 7 });
        }
        const styleLabel = STYLES.find(s => s.id === interactionStyle)?.label || interactionStyle;
        memoriesToStore.push({ text: `Prefers ${styleLabel} interaction style`, category: "preferences", importance: 6 });

        await Promise.all([
          supabase.from("companion_preferences" as any).upsert({
            user_id: user.id,
            preferred_name: preferredName || null,
            life_goal: lifeGoal || null,
            current_feeling: currentFeeling || null,
            companion_purposes: selectedPurposes,
            interaction_style: interactionStyle,
            onboarding_completed: true,
            updated_at: new Date().toISOString(),
          } as any, { onConflict: "user_id" }),
          supabase.from("ai_memory_preferences" as any).upsert({
            user_id: user.id,
            memory_enabled: true,
            updated_at: new Date().toISOString(),
          } as any, { onConflict: "user_id" }),
          preferredName
            ? supabase.from("profiles").update({ real_name: preferredName } as any).eq("user_id", user.id)
            : Promise.resolve(),
          ...memoriesToStore.map(mem =>
            supabase.from("ai_memories" as any).insert({
              user_id: user.id,
              memory_text: mem.text,
              category: mem.category,
              memory_type: mem.category,
              importance_score: mem.importance,
            } as any)
          ),
        ]);

        // Signal completion via custom event so Chat can update indicator
        window.dispatchEvent(new CustomEvent("memory-init-complete"));
      } catch (e) {
        console.error("Background onboarding save error:", e);
        window.dispatchEvent(new CustomEvent("memory-init-complete"));
      }
    })();
  };

  const skip = () => {
    // Mark as completed without data
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("companion_preferences" as any).upsert({
          user_id: user.id,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        } as any, { onConflict: "user_id" });
      }
    })();
    onComplete({ preferredName: "", lifeGoal: "", currentFeeling: "", purposes: [], interactionStyle: "balanced" });
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center" style={{ background: "linear-gradient(160deg, #0a3d24 0%, #0F5132 30%, #1a5c3a 60%, #0d4a2e 100%)" }}>
      <button onClick={skip} className="absolute top-4 right-4 text-white/50 hover:text-white/80 text-sm font-medium z-10 transition-colors">
        Skip
      </button>

      {/* Progress dots */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${i === step ? "bg-white w-6" : i < step ? "bg-white/60" : "bg-white/20"}`} />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-md mx-4 text-center"
        >
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="flex flex-col items-center gap-6 px-4">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-emerald-400" />
              </div>
              <h1 className="font-display text-3xl font-bold text-white">Meet Your Companions</h1>
              <p className="text-white/70 text-base leading-relaxed max-w-xs">
                Your AI companions will learn about you, remember your experiences, and support you over time. Let's get to know each other.
              </p>
              <Button variant="hero" size="lg" onClick={next} className="mt-4 w-full max-w-xs">
                Start <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* Step 1: Purpose Selection */}
          {step === 1 && (
            <div className="flex flex-col items-center gap-4 px-4">
              <h1 className="font-display text-2xl font-bold text-white">What do you want from your companions?</h1>
              <p className="text-white/60 text-sm">Select all that apply</p>
              <div className="grid gap-3 w-full max-w-xs">
                {PURPOSES.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => togglePurpose(p.id)}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left text-sm font-medium transition-all duration-200 ${
                      selectedPurposes.includes(p.id)
                        ? "border-emerald-400 bg-emerald-500/20 text-white"
                        : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    <p.icon className="w-5 h-5 shrink-0" />
                    {p.label}
                  </button>
                ))}
              </div>
              <Button variant="hero" size="lg" onClick={next} disabled={selectedPurposes.length === 0} className="mt-2 w-full max-w-xs">
                Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* Step 2: Personal Introduction */}
          {step === 2 && (
            <div className="flex flex-col items-center gap-5 px-4">
              <h1 className="font-display text-2xl font-bold text-white">Tell us about you</h1>
              <div className="w-full max-w-xs space-y-4">
                <div className="text-left">
                  <label className="text-white/70 text-sm mb-1.5 block">What should your companions call you?</label>
                  <input
                    value={preferredName}
                    onChange={(e) => setPreferredName(e.target.value)}
                    placeholder="Your name..."
                    className="w-full p-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-400/50 text-sm"
                  />
                </div>
                <div className="text-left">
                  <label className="text-white/70 text-sm mb-1.5 block">What are you currently working toward?</label>
                  <input
                    value={lifeGoal}
                    onChange={(e) => setLifeGoal(e.target.value)}
                    placeholder="e.g. Building my business, finishing school..."
                    className="w-full p-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-400/50 text-sm"
                  />
                </div>
                <div className="text-left">
                  <label className="text-white/70 text-sm mb-1.5 block">How have you been feeling lately?</label>
                  <div className="flex flex-wrap gap-2">
                    {FEELINGS.map((f) => (
                      <button
                        key={f}
                        onClick={() => setCurrentFeeling(f)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          currentFeeling === f
                            ? "bg-emerald-500/30 border-emerald-400 text-white border"
                            : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <Button variant="hero" size="lg" onClick={next} disabled={!preferredName.trim()} className="mt-2 w-full max-w-xs">
                Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* Step 3: Interaction Style */}
          {step === 3 && (
            <div className="flex flex-col items-center gap-5 px-4">
              <h1 className="font-display text-2xl font-bold text-white">How should your companions talk?</h1>
              <p className="text-white/60 text-sm">Choose your preferred interaction style</p>
              <div className="grid gap-3 w-full max-w-xs">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setInteractionStyle(s.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all duration-200 ${
                      interactionStyle === s.id
                        ? "border-emerald-400 bg-emerald-500/20"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="text-sm font-medium text-white">{s.label}</div>
                    <div className="text-xs text-white/50 mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>
              <Button variant="hero" size="lg" onClick={next} className="mt-2 w-full max-w-xs">
                Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* Step 4: Ready */}
          {step === 4 && (
            <div className="flex flex-col items-center gap-6 px-4">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-emerald-400" />
              </div>
              <h1 className="font-display text-3xl font-bold text-white">You're all set!</h1>
              <p className="text-white/70 text-base max-w-xs">
                {preferredName ? `${preferredName}, your` : "Your"} companions now know a bit about you. They'll remember your experiences and grow with you over time.
              </p>
              <Button variant="hero" size="lg" onClick={finish} disabled={saving} className="mt-4 w-full max-w-xs">
                {saving ? "Setting up..." : "Start Talking"} <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default CompanionOnboarding;
