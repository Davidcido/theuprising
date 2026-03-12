import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { X, Play, Pause, Moon, Volume2, VolumeX, Volume1 } from "lucide-react";
import { useAudioPreferences, fadeAudio } from "@/hooks/useAudioPreferences";
import { Slider } from "@/components/ui/slider";

// Ambient video scenes – using free stock videos
const SLEEP_SCENES = [
  { id: "forest", label: "Glowing Forest", emoji: "🌲", gradient: "from-emerald-950 to-green-900", videoUrl: "", audioTrack: "forest" },
  { id: "ocean", label: "Ocean Waves", emoji: "🌊", gradient: "from-blue-950 to-cyan-900", audioTrack: "ocean" },
  { id: "rain", label: "Gentle Rain", emoji: "🌧", gradient: "from-slate-950 to-gray-900", audioTrack: "forest" },
  { id: "night", label: "Night Sky", emoji: "🌌", gradient: "from-indigo-950 to-violet-900", audioTrack: "meditation" },
  { id: "sunrise", label: "Slow Sunrise", emoji: "🌅", gradient: "from-orange-950 to-amber-900", audioTrack: "piano" },
  { id: "piano", label: "Soft Piano", emoji: "🎹", gradient: "from-zinc-950 to-neutral-900", audioTrack: "piano" },
];

const AMBIENT_URLS: Record<string, string> = {
  forest: "https://cdn.pixabay.com/audio/2022/01/20/audio_ba6c0fee7f.mp3",
  ocean: "https://cdn.pixabay.com/audio/2022/08/02/audio_884fe92c21.mp3",
  meditation: "https://cdn.pixabay.com/audio/2022/05/16/audio_3b8e5c2eb1.mp3",
  piano: "https://cdn.pixabay.com/audio/2022/02/22/audio_d1718ab41b.mp3",
};

const VolumeIcon = ({ muted, volume }: { muted: boolean; volume: number }) => {
  if (muted || volume === 0) return <VolumeX className="w-5 h-5 text-white" />;
  if (volume < 0.5) return <Volume1 className="w-5 h-5 text-white" />;
  return <Volume2 className="w-5 h-5 text-white" />;
};

const SleepMode = () => {
  const navigate = useNavigate();
  const [activeScene, setActiveScene] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const { volume, muted, setVolume, toggleMute } = useAudioPreferences();

  // Auto-hide controls
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    hideTimer.current && clearTimeout(hideTimer.current);
    if (activeScene) {
      hideTimer.current = setTimeout(() => setShowControls(false), 5000);
    }
  }, [activeScene]);

  // Manage audio
  useEffect(() => {
    if (!activeScene) {
      if (audioRef.current) {
        fadeAudio(audioRef.current, 0, 500);
        setTimeout(() => { audioRef.current?.pause(); audioRef.current = null; }, 600);
      }
      return;
    }

    const scene = SLEEP_SCENES.find(s => s.id === activeScene);
    if (!scene) return;

    const trackUrl = AMBIENT_URLS[scene.audioTrack];
    if (!trackUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
    }

    const audio = audioRef.current;
    audio.src = trackUrl;
    audio.volume = 0;
    audio.muted = muted;
    audio.play().then(() => {
      if (!muted) fadeAudio(audio, volume, 2000);
    }).catch(() => {});

    return () => {
      if (audioRef.current) {
        fadeAudio(audioRef.current, 0, 300);
        setTimeout(() => { audioRef.current?.pause(); }, 400);
      }
    };
  }, [activeScene]);

  // Sync volume
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.muted = muted;
    if (!muted) audioRef.current.volume = volume;
  }, [volume, muted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (activeScene) {
    const scene = SLEEP_SCENES.find(s => s.id === activeScene)!;
    return (
      <div
        className="fixed inset-0 z-[150] cursor-pointer"
        onClick={resetHideTimer}
      >
        {/* Background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${scene.gradient}`} />

        {/* Animated particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white/10 rounded-full"
              initial={{
                x: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 400),
                y: Math.random() * (typeof window !== "undefined" ? window.innerHeight : 800),
              }}
              animate={{
                y: [null, -100],
                opacity: [0, 0.6, 0],
              }}
              transition={{
                duration: 8 + Math.random() * 12,
                repeat: Infinity,
                delay: Math.random() * 5,
              }}
            />
          ))}
        </div>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
          >
            <span className="text-5xl mb-4 block">{scene.emoji}</span>
            <h2 className="text-white/70 text-lg font-light tracking-wide">{scene.label}</h2>
            <p className="text-white/30 text-xs mt-2">Tap to show controls</p>
          </motion.div>

          {/* Audio visualizer */}
          {!muted && (
            <div className="mt-8 flex items-center gap-1">
              {[0, 1, 2, 3, 4, 5, 6].map(i => (
                <motion.div
                  key={i}
                  className="w-0.5 bg-white/20 rounded-full"
                  animate={{ height: [3, 10 + Math.random() * 8, 4, 12, 3] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Controls */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none"
            >
              {/* Top bar */}
              <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/40 to-transparent pointer-events-auto flex justify-between items-center">
                <button
                  onClick={() => setActiveScene(null)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
                <div className="flex items-center gap-3">
                  <span className="text-white/60 text-xs flex items-center gap-1.5">
                    <Moon className="w-3.5 h-3.5" /> Sleep Mode
                  </span>
                </div>
              </div>

              {/* Bottom controls */}
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/50 to-transparent pointer-events-auto">
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                    className="p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <VolumeIcon muted={muted} volume={volume} />
                  </button>
                  <div className="w-32">
                    <Slider
                      value={[muted ? 0 : volume]}
                      min={0}
                      max={1}
                      step={0.05}
                      onValueChange={(v) => setVolume(v[0])}
                      className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:border-white [&_[role=slider]]:bg-white [&_.bg-primary]:bg-emerald-400 [&_.bg-secondary]:bg-white/20"
                    />
                  </div>
                  <span className="text-white/40 text-xs w-8">{Math.round((muted ? 0 : volume) * 100)}%</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Scene selection
  return (
    <div className="min-h-screen pb-24 px-5 pt-2">
      <div className="flex items-center gap-3 mb-6">
        <Moon className="w-5 h-5 text-muted-foreground" />
        <div>
          <h1 className="text-xl font-bold text-foreground">Sleep Mode</h1>
          <p className="text-xs text-muted-foreground">Relax, meditate, or fall asleep peacefully</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {SLEEP_SCENES.map(scene => (
          <motion.button
            key={scene.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setActiveScene(scene.id); resetHideTimer(); }}
            className={`relative p-6 rounded-2xl bg-gradient-to-br ${scene.gradient} border border-white/10 text-left overflow-hidden group`}
          >
            <div className="relative z-10">
              <span className="text-3xl mb-2 block">{scene.emoji}</span>
              <p className="text-white/90 text-sm font-medium">{scene.label}</p>
              <p className="text-white/40 text-[10px] mt-1">Tap to start</p>
            </div>
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors" />
          </motion.button>
        ))}
      </div>

      <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
        <p className="text-xs text-muted-foreground leading-relaxed">
          🌙 Sleep Mode creates a peaceful ambient environment with calming sounds. 
          Adjust volume or mute anytime. Leave it running as you relax or fall asleep.
        </p>
      </div>
    </div>
  );
};

export default SleepMode;
