import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  Phone,
  Wind,
  Smile,
  BookOpen,
  Heart,
  X,
  PenLine,
  Lightbulb,
  HelpCircle,
  Brain,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BUILTIN_PERSONAS } from "@/lib/builtinPersonas";
import { getCompanionAvatar, getCompanionEmoji } from "@/lib/companionAvatars";
import { saveCompanionId } from "@/components/chat/PersonaSelector";
import ToolCard from "@/components/tools/ToolCard";
import VentMode from "@/components/tools/VentMode";
import VoiceCompanion from "@/components/tools/VoiceCompanion";
import BreathingExercise from "@/components/tools/BreathingExercise";
import MoodCheckIn from "@/components/tools/MoodCheckIn";
import JournalingPrompts from "@/components/tools/JournalingPrompts";
import GratitudeReflection from "@/components/tools/GratitudeReflection";
import { supabase } from "@/integrations/supabase/client";
import { useAuthReady } from "@/hooks/useAuthReady";

/* ── Quick AI Tools ── */
const quickTools = [
  {
    id: "ask",
    icon: MessageCircle,
    label: "Ask AI",
    desc: "Get answers to anything on your mind.",
    style: "companion",
  },
  {
    id: "write",
    icon: PenLine,
    label: "Writing Assistant",
    desc: "Help with essays, messages, and creative writing.",
    style: "creative",
  },
  {
    id: "idea",
    icon: Lightbulb,
    label: "Idea Generator",
    desc: "Brainstorm fresh ideas for any project.",
    style: "creative",
  },
  {
    id: "advice",
    icon: Heart,
    label: "Life Advice",
    desc: "Thoughtful guidance for life's big questions.",
    style: "companion",
  },
  {
    id: "explain",
    icon: HelpCircle,
    label: "Explain Something",
    desc: "Break down complex topics simply.",
    style: "thinking",
  },
  {
    id: "brainstorm",
    icon: Brain,
    label: "Brainstorm Ideas",
    desc: "Collaborate on creative solutions.",
    style: "thinking",
  },
];

/* ── Wellness Tools (legacy tools kept) ── */
const wellnessTools = [
  {
    id: "vent",
    icon: MessageCircle,
    title: "Vent Mode",
    description: "A safe space to release your thoughts.",
    gradient: "linear-gradient(135deg, #2E8B57, #0F5132)",
  },
  {
    id: "voice",
    icon: Phone,
    title: "Talk to Companion",
    description: "Speak like you're talking to a caring friend.",
    gradient: "linear-gradient(135deg, #0F5132, #1a6b3c)",
  },
  {
    id: "calm",
    icon: Wind,
    title: "Calm Mode",
    description: "Guided breathing and relaxation.",
    gradient: "linear-gradient(135deg, #3a9e6e, #2E8B57)",
  },
  {
    id: "mood",
    icon: Smile,
    title: "Mood Check-In",
    description: "Track how you're feeling today.",
    gradient: "linear-gradient(135deg, #4a8c5c, #2E8B57)",
  },
  {
    id: "journal",
    icon: BookOpen,
    title: "Guided Journaling",
    description: "Reflect with guided prompts.",
    gradient: "linear-gradient(135deg, #2E8B57, #3a7c50)",
  },
  {
    id: "gratitude",
    icon: Heart,
    title: "Gratitude Reflection",
    description: "Focus on positive moments.",
    gradient: "linear-gradient(135deg, #0F5132, #2E8B57)",
  },
];

const toolContent: Record<string, React.ReactNode> = {
  vent: <VentMode />,
  voice: <VoiceCompanion />,
  calm: <BreathingExercise />,
  mood: <MoodCheckIn />,
  journal: <JournalingPrompts />,
  gratitude: <GratitudeReflection />,
};

/* ── Check-in messages per companion ── */
const CHECKIN_MESSAGES: Record<string, string> = {
  seren: "Hey… just checking in. How has your day been? 💚",
  atlas: "I was thinking about something today. What's been on your mind?",
  orion: "What's one thing you want to accomplish today? 🔥",
  nova: "What's something new you discovered today? ✨",
  elias: "Have you learned something interesting today? 📚",
  kai: "Take a moment to breathe. How are you feeling right now? 🌿",
  leo: "What challenge are you working through today? 🛠",
  sol: "Just wanted to say — you're doing better than you think. 🌅",
};

const Tools = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const { user: authUser } = useAuthReady();
  const [checkinCompanion, setCheckinCompanion] = useState<string | null>(null);
  const active = wellnessTools.find((t) => t.id === activeTool);

  // Check for companion param from notification deep-link
  useEffect(() => {
    const companion = searchParams.get("companion");
    if (companion) {
      // Deep-link: open that companion's chat directly
      saveCompanionId(companion);
      navigate("/chat", { state: { newCompanionId: companion }, replace: true });
    }
  }, [searchParams, navigate]);

  // Fetch today's check-in notification
  useEffect(() => {
    if (!authUser?.id) return;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    supabase
      .from("notifications")
      .select("reference_id")
      .eq("user_id", authUser.id)
      .eq("type", "companion_checkin")
      .gte("created_at", todayStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0 && data[0].reference_id) {
          setCheckinCompanion(data[0].reference_id);
        } else {
          // Default to a random companion for check-in display
          const ids = Object.keys(CHECKIN_MESSAGES);
          setCheckinCompanion(ids[Math.floor(Math.random() * ids.length)]);
        }
      });
  }, [authUser?.id]);

  const handleCompanionTap = (companionId: string) => {
    saveCompanionId(companionId);
    navigate("/chat", { state: { newCompanionId: companionId } });
  };

  const handleQuickTool = (toolId: string, style: string) => {
    // Map quick tool to a chat with the best-suited companion + conversation style
    const companionMap: Record<string, string> = {
      ask: "atlas",
      write: "nova",
      idea: "nova",
      advice: "seren",
      explain: "elias",
      brainstorm: "leo",
    };
    const companionId = companionMap[toolId] || "seren";
    saveCompanionId(companionId);
    navigate("/chat", { state: { newCompanionId: companionId, conversationStyle: style } });
  };

  const checkinPerson = checkinCompanion
    ? BUILTIN_PERSONAS.find((p) => p.id === checkinCompanion)
    : null;
  const checkinAvatar = checkinPerson
    ? getCompanionAvatar(checkinPerson.name)
    : null;

  return (
    <div className="min-h-screen py-12 pb-24">
      <div className="container mx-auto px-4 max-w-lg">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-white/70 font-medium">AI-powered</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
            AI Hub
          </h1>
          <p className="text-white/50 text-sm max-w-xs mx-auto leading-relaxed">
            Your companions and AI tools, all in one place.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!activeTool ? (
            <motion.div
              key="hub"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              {/* ── Section 1: Talk to a Companion ── */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
                    Talk to a Companion
                  </h2>
                  <button
                    onClick={() => navigate("/companions")}
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                  >
                    View all <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                  {BUILTIN_PERSONAS.map((p, i) => {
                    const avatar = getCompanionAvatar(p.name);
                    return (
                      <motion.button
                        key={p.id}
                        type="button"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => handleCompanionTap(p.id)}
                        className="shrink-0 w-[130px] p-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all flex flex-col items-center text-center gap-1.5"
                      >
                        <div
                          className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-offset-2 ring-offset-background shadow-lg"
                          style={{ borderColor: p.color }}
                        >
                          <Avatar className="w-full h-full">
                            {avatar?.avatarUrl ? (
                              <AvatarImage src={avatar.avatarUrl} alt={p.name} />
                            ) : null}
                            <AvatarFallback className="text-lg bg-white/10 text-white">
                              {getCompanionEmoji(p.name)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <p className="text-sm font-semibold text-white">{p.name}</p>
                        <p
                          className="text-[10px] font-medium"
                          style={{ color: p.color }}
                        >
                          {p.roleTitle}
                        </p>
                        <p className="text-[10px] text-white/50 leading-tight italic line-clamp-2">
                          "{p.tagline}"
                        </p>
                      </motion.button>
                    );
                  })}
                </div>
              </section>

              {/* ── Section 2: Quick AI Tools ── */}
              <section>
                <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">
                  Quick AI Tools
                </h2>
                <div className="grid grid-cols-2 gap-2.5">
                  {quickTools.map((tool, i) => (
                    <motion.button
                      key={tool.id}
                      type="button"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.05 }}
                      onClick={() => handleQuickTool(tool.id, tool.style)}
                      className="flex items-start gap-3 p-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-left"
                    >
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <tool.icon className="w-4.5 h-4.5 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">{tool.label}</p>
                        <p className="text-[10px] text-white/45 leading-tight mt-0.5 line-clamp-2">
                          {tool.desc}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </section>

              {/* ── Section 3: Daily Companion Check-In ── */}
              {checkinPerson && (
                <motion.section
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">
                    Daily Companion Check-In
                  </h2>
                  <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-offset-2 ring-offset-background shrink-0"
                        style={{ borderColor: checkinPerson.color }}
                      >
                        <Avatar className="w-full h-full">
                          {checkinAvatar?.avatarUrl ? (
                            <AvatarImage src={checkinAvatar.avatarUrl} alt={checkinPerson.name} />
                          ) : null}
                          <AvatarFallback className="bg-white/10 text-white">
                            {getCompanionEmoji(checkinPerson.name)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/50 mb-0.5">
                          <span className="font-semibold text-white">{checkinPerson.name}</span>{" "}
                          checked in today
                        </p>
                        <p className="text-sm text-white/80 italic leading-relaxed">
                          "{CHECKIN_MESSAGES[checkinPerson.id]}"
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCompanionTap(checkinPerson.id)}
                      className="mt-3 w-full py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90"
                      style={{
                        background: `linear-gradient(135deg, ${checkinPerson.color}, ${checkinPerson.color}CC)`,
                      }}
                    >
                      Reply to {checkinPerson.name} <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[10px] text-white/30 text-center mt-2">
                    Your companions check in with you every day to see how you're doing.
                  </p>
                </motion.section>
              )}

              {/* ── Section 4: Wellness Tools ── */}
              <section>
                <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">
                  Wellness Tools
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {wellnessTools.map((tool, i) => (
                    <ToolCard
                      key={tool.id}
                      icon={tool.icon}
                      title={tool.title}
                      description={tool.description}
                      gradient={tool.gradient}
                      delay={0.4 + i * 0.05}
                      onClick={() => setActiveTool(tool.id)}
                    />
                  ))}
                </div>
              </section>
            </motion.div>
          ) : (
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="rounded-3xl backdrop-blur-xl border border-white/15 p-6 relative shadow-2xl"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 100%)",
              }}
            >
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setActiveTool(null)}
                className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 border border-white/15 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </motion.button>

              <div className="flex items-center gap-3 mb-6">
                {active && (
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
                    style={{ background: active.gradient }}
                  >
                    <active.icon className="w-5 h-5 text-white" />
                  </div>
                )}
                <h2 className="text-xl font-display font-bold text-white">
                  {active?.title}
                </h2>
              </div>

              {activeTool && toolContent[activeTool]}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Tools;
