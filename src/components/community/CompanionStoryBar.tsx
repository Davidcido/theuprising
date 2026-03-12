import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pause, Play, Volume2, VolumeX, Volume1 } from "lucide-react";
import { BUILTIN_PERSONAS, type BuiltinPersona } from "@/lib/builtinPersonas";
import { useAudioPreferences, fadeAudio } from "@/hooks/useAudioPreferences";
import { pickScenesForCompanion, getFallbackScene, type StoryScene } from "@/lib/storyScenes";
import { Slider } from "@/components/ui/slider";

const STORY_COMPANIONS = ["seren", "sol", "atlas", "nova", "kai"];

type StoryItem = {
  type: "text" | "reflection" | "breathing" | "inspiration";
  title: string;
  message: string;
  scene: StoryScene;
};

type CompanionStory = {
  companion: BuiltinPersona;
  stories: StoryItem[];
  hasNew: boolean;
};

const STORY_TEMPLATES: Record<string, { type: StoryItem["type"]; title: string; message: string }[]> = {
  seren: [
    { type: "reflection", title: "Evening Reflection", message: "Take a moment to check in with yourself. How are you really feeling right now? Whatever it is, it's okay. 💚" },
    { type: "breathing", title: "Calm Breathing", message: "Breathe in for 4 counts... Hold for 4... Release for 6. You're doing beautifully. 🌿" },
  ],
  sol: [
    { type: "inspiration", title: "Morning Light", message: "Every sunrise is a reminder — you get another chance to shine. What will you make of today? 🌅" },
    { type: "text", title: "Gratitude Moment", message: "Name one small thing that made you smile today. Even the tiniest spark counts. ✨" },
  ],
  atlas: [
    { type: "reflection", title: "Deep Thought", message: "What belief about yourself have you outgrown? Growth often starts with letting go of old stories. 🧠" },
    { type: "text", title: "Perspective Shift", message: "The obstacle you're facing might be the lesson you need. What is it trying to teach you? 💭" },
  ],
  nova: [
    { type: "inspiration", title: "Creative Spark", message: "Your imagination is your superpower. What would you create if nothing could stop you? ✨" },
    { type: "text", title: "Dream Big", message: "Close your eyes for 10 seconds. Picture your ideal day one year from now. Hold that vision. 🌟" },
  ],
  kai: [
    { type: "breathing", title: "Mindful Pause", message: "Stop scrolling for a moment. Feel your feet on the ground. Notice three sounds around you. You are here. 🌿" },
    { type: "reflection", title: "Inner Peace", message: "You don't have to have it all figured out. Sometimes the bravest thing is to simply be still. 🍃" },
  ],
};

const VolumeIcon = ({ muted, volume }: { muted: boolean; volume: number }) => {
  if (muted || volume === 0) return <VolumeX className="w-3.5 h-3.5 text-white" />;
  if (volume < 0.5) return <Volume1 className="w-3.5 h-3.5 text-white" />;
  return <Volume2 className="w-3.5 h-3.5 text-white" />;
};

/* ─── Story Video Background ─────────────────────────────────── */
const StoryVideo = ({
  scene,
  storyIndex,
  onFallback,
}: {
  scene: StoryScene;
  storyIndex: number;
  onFallback: (fallback: StoryScene) => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);

  // Reset ready state when scene changes
  useEffect(() => {
    setVideoReady(false);
  }, [scene.id, storyIndex]);

  const handleCanPlay = () => {
    setVideoReady(true);
    videoRef.current?.play().catch(() => {});
  };

  const handleError = () => {
    // Swap to a fallback scene if the video fails
    const fallback = getFallbackScene(scene.id);
    onFallback(fallback);
  };

  return (
    <div className="absolute inset-0">
      {/* Gradient fallback — always visible as base layer */}
      <div className={`absolute inset-0 bg-gradient-to-br ${scene.gradient}`} />

      {/* Video layer */}
      <video
        ref={videoRef}
        key={`${scene.video}-${storyIndex}`}
        src={scene.video}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        onCanPlay={handleCanPlay}
        onError={handleError}
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
        style={{ opacity: videoReady ? 1 : 0 }}
      />

      {/* Overlays for readability */}
      <div className={`absolute inset-0 bg-gradient-to-br ${scene.gradient} mix-blend-multiply transition-opacity duration-700`} style={{ opacity: videoReady ? 0.5 : 0.8 }} />
      <div className="absolute inset-0 bg-black/20" />
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────── */
const CompanionStoryBar = () => {
  const [companionStories, setCompanionStories] = useState<CompanionStory[]>([]);
  const [activeStory, setActiveStory] = useState<CompanionStory | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showVolumeControl, setShowVolumeControl] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { volume, muted, setVolume, toggleMute } = useAudioPreferences();
  const [viewedCompanions, setViewedCompanions] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("uprising_viewed_stories");
      const parsed = stored ? JSON.parse(stored) : {};
      const today = new Date().toDateString();
      return new Set(parsed[today] || []);
    } catch { return new Set(); }
  });

  const LOW_DEFAULT_VOLUME = 0.25;

  // Build stories with unique scenes per frame
  useEffect(() => {
    const stories = STORY_COMPANIONS.map(id => {
      const companion = BUILTIN_PERSONAS.find(p => p.id === id);
      if (!companion) return null;
      const templates = STORY_TEMPLATES[id] || [];
      const scenes = pickScenesForCompanion(id, templates.length);
      const items: StoryItem[] = templates.map((t, i) => ({
        ...t,
        scene: scenes[i % scenes.length],
      }));
      return { companion, stories: items, hasNew: !viewedCompanions.has(id) };
    }).filter(Boolean) as CompanionStory[];
    setCompanionStories(stories);
  }, [viewedCompanions]);

  // Handle video fallback — replace scene in active story
  const handleVideoFallback = useCallback((fallback: StoryScene) => {
    setActiveStory(prev => {
      if (!prev) return prev;
      const updated = { ...prev, stories: [...prev.stories] };
      updated.stories[storyIndex] = { ...updated.stories[storyIndex], scene: fallback };
      return updated;
    });
  }, [storyIndex]);

  // Start/crossfade ambient audio when frame changes
  useEffect(() => {
    if (!activeStory) {
      if (audioRef.current) {
        const audio = audioRef.current;
        fadeAudio(audio, 0, 400);
        setTimeout(() => { audio.pause(); audio.src = ""; }, 500);
        audioRef.current = null;
      }
      return;
    }

    const currentScene = activeStory.stories[storyIndex]?.scene;
    if (!currentScene?.audio) return;

    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
      audioRef.current.preload = "auto";
    }

    const audio = audioRef.current;
    const audioFileName = currentScene.audio.split("/").pop() || "___";
    const isSameTrack = audio.src && audio.src.includes(audioFileName);

    if (!isSameTrack) {
      fadeAudio(audio, 0, 250);
      setTimeout(() => {
        audio.src = currentScene.audio;
        audio.volume = 0;
        audio.muted = !hasInteracted;
        audio.play().then(() => {
          if (hasInteracted && !muted) {
            fadeAudio(audio, volume || LOW_DEFAULT_VOLUME, 800);
          }
        }).catch(() => {});
      }, 300);
    } else if (hasInteracted) {
      audio.muted = muted;
      if (!muted) audio.volume = volume || LOW_DEFAULT_VOLUME;
    }
  }, [activeStory, storyIndex, hasInteracted]);

  // Sync volume/mute preferences to active audio
  useEffect(() => {
    if (!audioRef.current || !hasInteracted) return;
    audioRef.current.muted = muted;
    if (!muted) audioRef.current.volume = volume || LOW_DEFAULT_VOLUME;
  }, [volume, muted, hasInteracted]);

  // Pause/resume audio
  useEffect(() => {
    if (!audioRef.current || !activeStory) return;
    if (paused) {
      fadeAudio(audioRef.current, 0, 300);
      setTimeout(() => audioRef.current?.pause(), 350);
    } else {
      audioRef.current.play().catch(() => {});
      if (hasInteracted && !muted) fadeAudio(audioRef.current, volume || LOW_DEFAULT_VOLUME, 500);
    }
  }, [paused]);

  // Auto-advance timer
  useEffect(() => {
    if (!activeStory || paused) return;
    const duration = 8000;
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
          setHasInteracted(false);
        }
      }
    }, interval);
    return () => clearInterval(timer);
  }, [activeStory, storyIndex, paused]);

  // Handle first user interaction — unmute & fade in audio
  const handleUserInteraction = useCallback(() => {
    if (hasInteracted) return;
    setHasInteracted(true);
    if (audioRef.current) {
      audioRef.current.muted = false;
      fadeAudio(audioRef.current, volume || LOW_DEFAULT_VOLUME, 800);
    }
  }, [hasInteracted, volume]);

  const openStory = (cs: CompanionStory) => {
    setActiveStory(cs);
    setStoryIndex(0);
    setProgress(0);
    setPaused(false);
    setHasInteracted(false);
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
    handleUserInteraction();
    if (storyIndex < activeStory.stories.length - 1) {
      setStoryIndex(prev => prev + 1);
      setProgress(0);
    } else {
      const idx = companionStories.findIndex(cs => cs.companion.id === activeStory.companion.id);
      if (idx < companionStories.length - 1) openStory(companionStories[idx + 1]);
      else { setActiveStory(null); setHasInteracted(false); }
    }
  };

  const goPrev = () => {
    if (!activeStory) return;
    handleUserInteraction();
    if (storyIndex > 0) {
      setStoryIndex(prev => prev - 1);
      setProgress(0);
    }
  };

  const handleToggleMute = () => {
    handleUserInteraction();
    toggleMute();
    if (audioRef.current) {
      if (muted) {
        audioRef.current.muted = false;
        fadeAudio(audioRef.current, volume || LOW_DEFAULT_VOLUME, 400);
      } else {
        fadeAudio(audioRef.current, 0, 200);
        setTimeout(() => { if (audioRef.current) audioRef.current.muted = true; }, 250);
      }
    }
  };

  const handleVolumeChange = (value: number[]) => {
    handleUserInteraction();
    setVolume(value[0]);
  };

  if (companionStories.length === 0) return null;

  const currentStory = activeStory?.stories[storyIndex];

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
                  : "bg-muted"
              }`}>
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-background">
                  <img src={cs.companion.avatar_image} alt={cs.companion.name} className="w-full h-full object-cover" />
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
        {activeStory && currentStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
            onClick={(e) => { if (e.target === e.currentTarget) { setActiveStory(null); setHasInteracted(false); } }}
          >
            <div
              className="relative w-full max-w-md h-[85vh] max-h-[700px] rounded-2xl overflow-hidden"
              onClick={() => handleUserInteraction()}
            >
              {/* Video Background with fallback */}
              <StoryVideo
                scene={currentStory.scene}
                storyIndex={storyIndex}
                onFallback={handleVideoFallback}
              />

              {/* "Tap for sound" hint */}
              <AnimatePresence>
                {!hasInteracted && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.5 }}
                    className="absolute bottom-20 left-0 right-0 z-30 flex justify-center pointer-events-none"
                  >
                    <div className="bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
                      <Volume2 className="w-3.5 h-3.5 text-white/70" />
                      <span className="text-white/70 text-xs">Tap for sound</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Progress bars */}
              <div className="absolute top-3 left-3 right-3 z-20 flex gap-1">
                {activeStory.stories.map((_, i) => (
                  <div key={i} className="flex-1 h-[3px] rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-100"
                      style={{ width: i < storyIndex ? "100%" : i === storyIndex ? `${progress}%` : "0%" }}
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
                    <p className="text-white/50 text-[10px]">{currentStory.scene.label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 relative">
                    <button onClick={handleToggleMute} onTouchStart={() => setShowVolumeControl(!showVolumeControl)} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20">
                      <VolumeIcon muted={!hasInteracted || muted} volume={volume} />
                    </button>
                    <AnimatePresence>
                      {showVolumeControl && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8, y: -10 }}
                          className="absolute top-full right-0 mt-2 bg-black/80 backdrop-blur-sm rounded-xl p-3 flex flex-col items-center gap-2 min-w-[44px]"
                        >
                          <div className="h-24 flex items-center">
                            <Slider
                              orientation="vertical"
                              value={[muted ? 0 : volume]}
                              min={0} max={1} step={0.05}
                              onValueChange={handleVolumeChange}
                              className="h-full [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:border-white [&_[role=slider]]:bg-white [&_.bg-primary]:bg-emerald-400 [&_.bg-secondary]:bg-white/20"
                            />
                          </div>
                          <span className="text-[9px] text-white/50">{Math.round((muted ? 0 : volume) * 100)}%</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <button onClick={() => setPaused(!paused)} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20">
                    {paused ? <Play className="w-3.5 h-3.5 text-white" /> : <Pause className="w-3.5 h-3.5 text-white" />}
                  </button>
                  <button onClick={() => { setActiveStory(null); setHasInteracted(false); }} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20">
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              {/* Story Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={storyIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 text-center"
                >
                  <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-4">
                    {currentStory.type === "breathing" ? "🌬 Breathing Exercise" :
                     currentStory.type === "reflection" ? "💭 Reflection" :
                     currentStory.type === "inspiration" ? "✨ Inspiration" : "💚 Message"}
                  </p>
                  <h2 className="text-white text-2xl font-bold mb-6 drop-shadow-lg">
                    {currentStory.title}
                  </h2>
                  <p className="text-white/90 text-base leading-relaxed max-w-xs mx-auto drop-shadow-md">
                    {currentStory.message}
                  </p>

                  {/* Audio visualizer */}
                  {hasInteracted && !muted && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-6 flex items-center justify-center gap-1.5"
                    >
                      {[0, 1, 2, 3, 4].map(i => (
                        <motion.div
                          key={i}
                          className="w-0.5 bg-white/30 rounded-full"
                          animate={{ height: [4, 12, 6, 14, 4] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                      <span className="text-white/30 text-[9px] ml-2">{currentStory.scene.label}</span>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Navigation areas */}
              <div className="absolute inset-0 z-10 flex pointer-events-none">
                <button className="w-1/3 h-full pointer-events-auto" onClick={goPrev} />
                <div className="w-1/3" />
                <button className="w-1/3 h-full pointer-events-auto" onClick={goNext} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CompanionStoryBar;
