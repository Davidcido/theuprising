import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Sparkles, Users, Pencil, Heart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import uprisingLogo from "@/assets/uprising-logo.jpeg";

const REASONS = [
  "I need someone to talk to",
  "I want emotional support",
  "I want to connect with others",
  "I want to express myself",
];

const FEATURES = [
  { icon: MessageCircle, title: "Start Talking", desc: "Chat with your companion and share how you're feeling." },
  { icon: Sparkles, title: "Explore Tools", desc: "Access emotional wellness tools and support resources." },
  { icon: Users, title: "Connect with the Community", desc: "Discover and interact with people who are part of the Uprising community." },
  { icon: Pencil, title: "Express Yourself", desc: "Share posts, thoughts, and creativity in a supportive space." },
];

const slideVariants = {
  enter: { opacity: 0, x: 60 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -60 },
};

interface Props {
  onComplete: () => void;
}

const OnboardingFlow = ({ onComplete }: Props) => {
  const [step, setStep] = useState(0);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  const completeOnboarding = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("user_onboarding").insert({
          user_id: user.id,
          onboarding_reason: selectedReason,
        });
      }
    } catch (e) {
      console.error("Failed to save onboarding:", e);
    }
    onComplete();
  };

  const skip = () => completeOnboarding();
  const next = () => setStep((s) => s + 1);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "linear-gradient(160deg, #0a3d24 0%, #0F5132 30%, #1a5c3a 60%, #0d4a2e 100%)" }}>
      {/* Skip button */}
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
          {step === 0 && (
            <div className="flex flex-col items-center gap-6 px-4">
              <img src={uprisingLogo} alt="Uprising" className="w-24 h-24 rounded-3xl shadow-lg" />
              <h1 className="font-display text-3xl font-bold text-white">Welcome to Uprising</h1>
              <p className="text-white/70 text-base leading-relaxed max-w-xs">
                Your safe space to connect, express, and heal. A place where people support each other, share their stories, and grow together.
              </p>
              <Button variant="hero" size="lg" onClick={next} className="mt-4 w-full max-w-xs">
                Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col items-center gap-6 px-4">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
                <Heart className="w-10 h-10 text-emerald-400" />
              </div>
              <h1 className="font-display text-3xl font-bold text-white">Rise Together</h1>
              <p className="text-white/70 text-base leading-relaxed max-w-xs">
                Uprising Companion is your emotional support friend and community space. Talk freely, share your story, connect with others, and grow in a place built on empathy, creativity, and positive energy.
              </p>
              <Button variant="hero" size="lg" onClick={next} className="mt-4 w-full max-w-xs">
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center gap-4 px-4">
              <h1 className="font-display text-2xl font-bold text-white">Getting Started</h1>
              <p className="text-white/60 text-sm mb-2">Here's how to begin your journey.</p>
              <div className="grid gap-3 w-full">
                {FEATURES.map((f) => (
                  <div key={f.title} className="flex items-start gap-3 p-3 rounded-2xl border border-white/10 backdrop-blur-sm text-left" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <f.icon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-white text-sm">{f.title}</h3>
                      <p className="text-white/50 text-xs leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="hero" size="lg" onClick={next} className="mt-2 w-full max-w-xs">
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center gap-6 px-4">
              <h1 className="font-display text-2xl font-bold text-white">What brings you to Uprising today?</h1>
              <div className="grid gap-3 w-full max-w-xs">
                {REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedReason(r)}
                    className={`p-3.5 rounded-2xl border text-left text-sm font-medium transition-all duration-200 ${
                      selectedReason === r
                        ? "border-emerald-400 bg-emerald-500/20 text-white"
                        : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <Button variant="hero" size="lg" onClick={next} disabled={!selectedReason} className="mt-2 w-full max-w-xs">
                Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col items-center gap-6 px-4">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-emerald-400" />
              </div>
              <h1 className="font-display text-3xl font-bold text-white">You're all set.</h1>
              <p className="text-white/70 text-base">Welcome to the Uprising community.</p>
              <Button variant="hero" size="lg" onClick={completeOnboarding} className="mt-4 w-full max-w-xs">
                Enter Uprising <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default OnboardingFlow;
