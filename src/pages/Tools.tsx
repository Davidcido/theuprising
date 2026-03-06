import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Phone, Wind, Smile, BookOpen, Heart, X } from "lucide-react";
import uprisingLogo from "@/assets/uprising-logo.jpeg";
import ToolCard from "@/components/tools/ToolCard";
import VentMode from "@/components/tools/VentMode";
import VoiceCompanion from "@/components/tools/VoiceCompanion";
import BreathingExercise from "@/components/tools/BreathingExercise";
import MoodCheckIn from "@/components/tools/MoodCheckIn";
import JournalingPrompts from "@/components/tools/JournalingPrompts";
import GratitudeReflection from "@/components/tools/GratitudeReflection";

const tools = [
  {
    id: "vent",
    icon: MessageCircle,
    title: "Vent Mode",
    description: "A safe space to release your thoughts and emotions freely.",
    gradient: "linear-gradient(135deg, #2E8B57, #0F5132)",
  },
  {
    id: "voice",
    icon: Phone,
    title: "Talk to Companion",
    description: "Speak with the AI like you're talking to a caring friend.",
    gradient: "linear-gradient(135deg, #0F5132, #1a6b3c)",
  },
  {
    id: "calm",
    icon: Wind,
    title: "Calm Mode",
    description: "Guided breathing and relaxation exercises.",
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
    description: "Reflect on your thoughts with guided prompts.",
    gradient: "linear-gradient(135deg, #2E8B57, #3a7c50)",
  },
  {
    id: "gratitude",
    icon: Heart,
    title: "Gratitude Reflection",
    description: "Focus on positive moments in your life.",
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

const Tools = () => {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const active = tools.find((t) => t.id === activeTool);

  return (
    <div className="min-h-screen py-12 pb-24">
      <div className="container mx-auto px-4 max-w-lg">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center mb-8"
        >
          <div className="relative">
            <div
              className="absolute inset-0 rounded-3xl blur-2xl opacity-50"
              style={{ background: "radial-gradient(circle, rgba(207,245,231,0.4), transparent)" }}
            />
            <img
              src={uprisingLogo}
              alt="The Uprising"
              className="relative w-28 h-28 rounded-3xl object-cover shadow-xl"
            />
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3">
            Healing Tools
          </h1>
          <p className="text-white/60 text-sm max-w-xs mx-auto leading-relaxed">
            Your digital sanctuary for emotional wellness and self-care.
          </p>
        </motion.div>

        {/* Tool Cards Grid */}
        <AnimatePresence mode="wait">
          {!activeTool ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="grid grid-cols-2 gap-3"
            >
              {tools.map((tool, i) => (
                <ToolCard
                  key={tool.id}
                  icon={tool.icon}
                  title={tool.title}
                  description={tool.description}
                  gradient={tool.gradient}
                  delay={i * 0.08}
                  onClick={() => setActiveTool(tool.id)}
                />
              ))}
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
                background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 100%)",
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
