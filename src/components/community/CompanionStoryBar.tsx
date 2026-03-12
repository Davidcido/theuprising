import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { BUILTIN_PERSONAS, type BuiltinPersona } from "@/lib/builtinPersonas";
import { supabase } from "@/integrations/supabase/client";

const STORY_COMPANIONS = ["seren", "sol", "atlas", "nova", "kai"];

type StoryItem = {
  type: "text" | "reflection" | "breathing" | "inspiration";
  title: string;
  message: string;
  gradient: string;
};

type CompanionStory = {
  companion: BuiltinPersona;
  stories: StoryItem[];
  hasNew: boolean;
};

const DEFAULT_STORIES: Record<string, StoryItem[]> = {
  seren: [
    { type: "reflection", title: "Evening Reflection", message: "Take a moment to check in with yourself. How are you really feeling right now? Whatever it is, it's okay. 💚", gradient: "from-emerald-900/90 via-emerald-800/80 to-teal-900/90" },
    { type: "breathing", title: "Calm Breathing", message: "Breathe in for 4 counts... Hold for 4... Release for 6. You're doing beautifully. 🌿", gradient: "from-teal-900/90 via-emerald-900/80 to-green-900/90" },
  ],
  sol: [
    { type: "inspiration", title: "Morning Light", message: "Every sunrise is a reminder — you get another chance to shine. What will you make of today? 🌅", gradient: "from-orange-900/90 via-amber-800/80 to-yellow-900/90" },
    { type: "text", title: "Gratitude Moment", message: "Name one small thing that made you smile today. Even the tiniest spark counts. ✨", gradient: "from-amber-900/90 via-orange-900/80 to-red-900/90" },
  ],
  atlas: [
    { type: "reflection", title: "Deep Thought", message: "What belief about yourself have you outgrown? Growth often starts with letting go of old stories. 🧠", gradient: "from-indigo-900/90 via-purple-900/80 to-blue-900/90" },
    { type: "text", title: "Perspective Shift", message: "The obstacle you're facing might be the lesson you need. What is it trying to teach you? 💭", gradient: "from-blue-900/90 via-indigo-900/80 to-violet-900/90" },
  ],
  nova: [
    { type: "inspiration", title: "Creative Spark", message: "Your imagination is your superpower. What would you create if nothing could stop you? ✨", gradient: "from-pink-900/90 via-fuchsia-900/80 to-purple-900/90" },
    { type: "text", title: "Dream Big", message: "Close your eyes for 10 seconds. Picture your ideal day one year from now. Hold that vision. 🌟", gradient: "from-fuchsia-900/90 via-pink-900/80 to-rose-900/90" },
  ],
  kai: [
    { type: "breathing", title: "Mindful Pause", message: "Stop scrolling for a moment. Feel your feet on the ground. Notice three sounds around you. You are here. 🌿", gradient: "from-violet-900/90 via-purple-900/80 to-indigo-900/90" },
    { type: "reflection", title: "Inner Peace", message: "You don't have to have it all figured out. Sometimes the bravest thing is to simply be still. 🍃", gradient: "from-purple-900/90 via-violet-900/80 to-blue-900/90" },
  ],
};

const CompanionStoryBar = () => {
  const [companionStories, setCompanionStories] = useState<CompanionStory[]>([]);
  const [activeStory, setActiveStory] = useState<CompanionStory | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [viewedCompanions, setViewedCompanions] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("uprising_viewed_stories");
      const parsed = stored ? JSON.parse(stored) : {};
      const today = new Date().toDateString();
      return new Set(parsed[today] || []);
    } catch { return new Set(); }
  });

  useEffect(() => {
    const stories = STORY_COMPANIONS.map(id => {
      const companion = BUILTIN_PERSONAS.find(p => p.id === id);
      if (!companion) return null;
      return {
        companion,
        stories: DEFAULT_STORIES[id] || [],
        hasNew: !viewedCompanions.has(id),
      };
    }).filter(Boolean) as CompanionStory[];
    setCompanionStories(stories);
  }, [viewedCompanions]);

  // Auto-advance timer
  useEffect(() => {
    if (!activeStory || paused) return;
    const duration = 6000;
    const interval = 50;
    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += interval;
      setProgress((elapsed / duration) * 100);
      if (elapsed >= duration) {
        if (storyIndex < activeStory.stories.length - 1) {
          setStoryIndex(prev => prev + 1);
          elapsed = 0;
          setProgress(0);
        } else {
          setActiveStory(null);
          setStoryIndex(0);
          setProgress(0);
        }
      }
    }, interval);
    return () => clearInterval(timer);
  }, [activeStory, storyIndex, paused]);

  const openStory = (cs: CompanionStory) => {
    setActiveStory(cs);
    setStoryIndex(0);
    setProgress(0);
    setPaused(false);
    // Mark as viewed
    const newViewed = new Set(viewedCompanions).add(cs.companion.id);
    setViewedCompanions(newViewed);
    try {
      const today = new Date().toDateString();
      const stored = JSON.parse(localStorage.getItem("uprising_viewed_stories") || "{}");
      stored[today] = [...newViewed];
      localStorage.setItem("uprising_viewed_stories", JSON.stringify(stored));
    } catch {}
  };

  const goNext = () => {
    if (!activeStory) return;
    if (storyIndex < activeStory.stories.length - 1) {
      setStoryIndex(prev => prev + 1);
      setProgress(0);
    } else {
      // Move to next companion
      const idx = companionStories.findIndex(cs => cs.companion.id === activeStory.companion.id);
      if (idx < companionStories.length - 1) {
        openStory(companionStories[idx + 1]);
      } else {
        setActiveStory(null);
      }
    }
  };

  const goPrev = () => {
    if (!activeStory) return;
    if (storyIndex > 0) {
      setStoryIndex(prev => prev - 1);
      setProgress(0);
    }
  };

  if (companionStories.length === 0) return null;

  return (
    <>
      {/* Story Bar */}
      <div className="mb-5 overflow-x-auto scrollbar-hide">
        <div className="flex gap-3 py-1 px-1">
          {companionStories.map(cs => (
            <button
              key={cs.companion.id}
              onClick={() => openStory(cs)}
              className="flex flex-col items-center gap-1.5 min-w-[64px] group"
            >
              <div className={`relative rounded-full p-[2.5px] transition-all ${
                cs.hasNew
                  ? "bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400"
                  : "bg-white/20"
              }`}>
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-background">
                  <img
                    src={cs.companion.avatar_image}
                    alt={cs.companion.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                {cs.hasNew && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-background" />
                )}
              </div>
              <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors font-medium truncate max-w-[64px]">
                {cs.companion.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Story Viewer */}
      <AnimatePresence>
        {activeStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
            onClick={(e) => { if (e.target === e.currentTarget) setActiveStory(null); }}
          >
            <div className="relative w-full max-w-md h-[85vh] max-h-[700px] rounded-2xl overflow-hidden">
              {/* Progress bars */}
              <div className="absolute top-3 left-3 right-3 z-20 flex gap-1">
                {activeStory.stories.map((_, i) => (
                  <div key={i} className="flex-1 h-[3px] rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all"
                      style={{
                        width: i < storyIndex ? "100%" : i === storyIndex ? `${progress}%` : "0%",
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Header */}
              <div className="absolute top-8 left-4 right-4 z-20 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-white/30">
                    <img src={activeStory.companion.avatar_image} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{activeStory.companion.name}</p>
                    <p className="text-white/50 text-[10px]">{activeStory.companion.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPaused(!paused)} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20">
                    {paused ? <Play className="w-3.5 h-3.5 text-white" /> : <Pause className="w-3.5 h-3.5 text-white" />}
                  </button>
                  <button onClick={() => setActiveStory(null)} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20">
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              {/* Story Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={storyIndex}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                  className={`w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br ${activeStory.stories[storyIndex]?.gradient || "from-emerald-900/90 to-teal-900/90"}`}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-4">
                      {activeStory.stories[storyIndex]?.type === "breathing" ? "🌬 Breathing Exercise" :
                       activeStory.stories[storyIndex]?.type === "reflection" ? "💭 Reflection" :
                       activeStory.stories[storyIndex]?.type === "inspiration" ? "✨ Inspiration" : "💚 Message"}
                    </p>
                    <h2 className="text-white text-2xl font-bold mb-6">
                      {activeStory.stories[storyIndex]?.title}
                    </h2>
                    <p className="text-white/90 text-base leading-relaxed max-w-xs mx-auto">
                      {activeStory.stories[storyIndex]?.message}
                    </p>
                  </motion.div>
                </motion.div>
              </AnimatePresence>

              {/* Navigation areas */}
              <div className="absolute inset-0 z-10 flex">
                <button className="w-1/3 h-full" onClick={goPrev} />
                <div className="w-1/3" />
                <button className="w-1/3 h-full" onClick={goNext} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CompanionStoryBar;
