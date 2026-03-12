import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Play, Pause, Volume2, VolumeX, Volume1, Maximize, Minimize,
  Heart, MessageCircle, Share2, Repeat2, Eye, Loader2, AlertCircle, RefreshCw,
} from "lucide-react";
import { useAudioPreferences, fadeAudio } from "@/hooks/useAudioPreferences";
import { Slider } from "@/components/ui/slider";

interface VideoPlayerProps {
  url: string;
  isOpen: boolean;
  onClose: () => void;
  postData?: {
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    viewsCount: number;
    isLiked: boolean;
    onToggleLike: () => void;
    onToggleComments: () => void;
    onShare: () => void;
    onRepost: () => void;
  };
}

const formatTime = (seconds: number) => {
  if (!isFinite(seconds) || isNaN(seconds) || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const VolumeIcon = ({ muted, volume }: { muted: boolean; volume: number }) => {
  if (muted || volume === 0) return <VolumeX className="w-5 h-5 text-white" />;
  if (volume < 0.5) return <Volume1 className="w-5 h-5 text-white" />;
  return <Volume2 className="w-5 h-5 text-white" />;
};

const VideoPlayer = ({ url, isOpen, onClose, postData }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);
  const [error, setError] = useState(false);
  const [loadTimeout, setLoadTimeout] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const { volume, muted, setVolume, toggleMute } = useAudioPreferences();

  // Sync audio prefs to video element
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    v.volume = muted ? 0 : volume;
  }, [volume, muted, isOpen]);

  // Reset state when URL changes or player opens
  useEffect(() => {
    if (isOpen) {
      setError(false);
      setLoadTimeout(false);
      setBuffering(true);
      setCurrentTime(0);
      setDuration(0);
      setPlaying(false);
    }
  }, [isOpen, url]);

  // Auto-play on open with fade-in
  useEffect(() => {
    if (!isOpen || !videoRef.current || error) return;

    const v = videoRef.current;
    v.muted = true; // Start muted for autoplay
    v.volume = 0;
    v.load();

    const playWhenReady = () => {
      v.play().then(() => {
        setPlaying(true);
        setBuffering(false);
        // Fade in audio if user preference is unmuted
        if (!muted) {
          setTimeout(() => {
            v.muted = false;
            fadeAudio(v, volume, 1200);
          }, 300);
        }
      }).catch(() => setPlaying(false));
    };

    if (v.readyState >= 1) {
      setDuration(v.duration || 0);
      playWhenReady();
    } else {
      v.addEventListener("loadedmetadata", () => {
        setDuration(v.duration || 0);
        playWhenReady();
      }, { once: true });
    }

    const timeout = setTimeout(() => {
      if (v.readyState < 2) {
        setLoadTimeout(true);
        setBuffering(false);
      }
    }, 15000);

    return () => {
      clearTimeout(timeout);
      hideTimer.current && clearTimeout(hideTimer.current);
    };
  }, [isOpen, url, error]);

  // Auto-hide controls
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    hideTimer.current && clearTimeout(hideTimer.current);
    if (playing) {
      hideTimer.current = setTimeout(() => {
        setShowControls(false);
        setShowVolumeSlider(false);
      }, 3000);
    }
  }, [playing]);

  useEffect(() => { resetHideTimer(); }, [playing, resetHideTimer]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isOpen]);

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " ") { e.preventDefault(); togglePlay(); }
      if (e.key === "m") handleToggleMute();
      if (e.key === "ArrowRight") seek(5);
      if (e.key === "ArrowLeft") seek(-5);
      if (e.key === "ArrowUp") { e.preventDefault(); setVolume(Math.min(1, volume + 0.1)); }
      if (e.key === "ArrowDown") { e.preventDefault(); setVolume(Math.max(0, volume - 0.1)); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, playing, volume]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play().catch(() => {}); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const handleToggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    if (muted) {
      // Unmuting: fade in
      v.muted = false;
      v.volume = 0;
      fadeAudio(v, volume, 600);
    } else {
      // Muting: instant
      v.muted = true;
      v.volume = 0;
    }
    toggleMute();
  };

  const handleVolumeChange = (value: number[]) => {
    const v = videoRef.current;
    const newVol = value[0];
    setVolume(newVol);
    if (v) {
      v.muted = newVol === 0;
      v.volume = newVol;
    }
    resetHideTimer();
  };

  const seek = (delta: number) => {
    const v = videoRef.current;
    if (!v || !isFinite(v.duration)) return;
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + delta));
  };

  const handleProgressClick = (e: React.MouseEvent) => {
    const bar = progressRef.current;
    const v = videoRef.current;
    if (!bar || !v || !isFinite(v.duration) || v.duration <= 0) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = pct * v.duration;
  };

  const handleDurationChange = () => {
    const v = videoRef.current;
    if (v && isFinite(v.duration) && v.duration > 0) {
      setDuration(v.duration);
    }
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    if (duration === 0 && isFinite(v.duration) && v.duration > 0) {
      setDuration(v.duration);
    }
  };

  const handleRetry = () => {
    setError(false);
    setLoadTimeout(false);
    setBuffering(true);
    const v = videoRef.current;
    if (v) {
      v.src = url + (url.includes("?") ? "&" : "?") + `_r=${Date.now()}`;
      v.load();
    }
  };

  const toggleNativeFullscreen = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (!document.fullscreenElement) {
        await v.requestFullscreen();
        setIsNativeFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsNativeFullscreen(false);
      }
    } catch {}
  };

  useEffect(() => {
    const handler = () => setIsNativeFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!isOpen) return null;

  const showError = error || loadTimeout;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
        onClick={resetHideTimer}
      >
        {/* Video */}
        <video
          ref={videoRef}
          src={url}
          crossOrigin="anonymous"
          className="w-full h-full object-contain"
          playsInline
          loop
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleDurationChange}
          onDurationChange={handleDurationChange}
          onLoadedData={() => { setBuffering(false); handleDurationChange(); }}
          onWaiting={() => setBuffering(true)}
          onPlaying={() => { setBuffering(false); setError(false); }}
          onCanPlay={() => setBuffering(false)}
          onError={(e) => { console.error("[VideoPlayer] Playback error:", url, e.currentTarget.error?.code, e.currentTarget.error?.message); setError(true); }}
          onClick={(e) => { e.stopPropagation(); togglePlay(); resetHideTimer(); }}
        />

        {/* Error state */}
        {showError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80">
            <AlertCircle className="w-10 h-10 text-white/50" />
            <p className="text-sm text-white/70">{loadTimeout ? "Video is taking too long to load" : "Video failed to load"}</p>
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Retry
            </button>
          </div>
        )}

        {/* Buffering spinner */}
        {buffering && !showError && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
        )}

        {/* Large play/pause indicator */}
        {!playing && !buffering && !showError && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center">
              <Play className="w-8 h-8 text-white ml-1" fill="white" />
            </div>
          </div>
        )}

        {/* Controls overlay */}
        <AnimatePresence>
          {showControls && !showError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 pointer-events-none"
            >
              {/* Top bar */}
              <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-auto flex justify-between items-center">
                <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                  <X className="w-5 h-5 text-white" />
                </button>
                <button onClick={toggleNativeFullscreen} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                  {isNativeFullscreen ? <Minimize className="w-5 h-5 text-white" /> : <Maximize className="w-5 h-5 text-white" />}
                </button>
              </div>

              {/* Bottom controls */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent pointer-events-auto">
                {/* Seek bar */}
                <div
                  ref={progressRef}
                  onClick={handleProgressClick}
                  className="w-full px-4 py-2 cursor-pointer group"
                >
                  <div className="h-1 bg-white/20 rounded-full relative group-hover:h-1.5 transition-all">
                    <div
                      className="h-full bg-emerald-400 rounded-full relative"
                      style={{ width: `${progress}%` }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
                    </div>
                  </div>
                </div>

                {/* Controls row */}
                <div className="flex items-center justify-between px-4 pb-4 pt-1">
                  <div className="flex items-center gap-2">
                    <button onClick={togglePlay} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                      {playing ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" fill="white" />}
                    </button>
                    
                    {/* Volume control group */}
                    <div className="flex items-center gap-1 relative">
                      <button
                        onClick={handleToggleMute}
                        onMouseEnter={() => setShowVolumeSlider(true)}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                      >
                        <VolumeIcon muted={muted} volume={volume} />
                      </button>
                      
                      <AnimatePresence>
                        {showVolumeSlider && (
                          <motion.div
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 100 }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden flex items-center"
                            onMouseLeave={() => setShowVolumeSlider(false)}
                          >
                            <Slider
                              value={[muted ? 0 : volume]}
                              min={0}
                              max={1}
                              step={0.05}
                              onValueChange={handleVolumeChange}
                              className="w-[90px] [&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5 [&_[role=slider]]:border-white [&_[role=slider]]:bg-white [&_.bg-primary]:bg-emerald-400 [&_.bg-secondary]:bg-white/20"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    
                    <span className="text-xs text-white/70 font-mono tabular-nums">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  {/* Interaction buttons */}
                  {postData && (
                    <div className="flex items-center gap-1">
                      <button onClick={postData.onToggleLike} className="flex items-center gap-1 px-2 py-1.5 rounded-full hover:bg-white/10 transition-colors">
                        <Heart className={`w-4 h-4 ${postData.isLiked ? "text-red-400 fill-red-400" : "text-white/80"}`} />
                        <span className="text-xs text-white/70">{postData.likesCount}</span>
                      </button>
                      <button onClick={postData.onToggleComments} className="flex items-center gap-1 px-2 py-1.5 rounded-full hover:bg-white/10 transition-colors">
                        <MessageCircle className="w-4 h-4 text-white/80" />
                        <span className="text-xs text-white/70">{postData.commentsCount}</span>
                      </button>
                      <button onClick={postData.onRepost} className="flex items-center gap-1 px-2 py-1.5 rounded-full hover:bg-white/10 transition-colors">
                        <Repeat2 className="w-4 h-4 text-white/80" />
                        <span className="text-xs text-white/70">{postData.sharesCount}</span>
                      </button>
                      <button onClick={postData.onShare} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
                        <Share2 className="w-4 h-4 text-white/80" />
                      </button>
                      <div className="flex items-center gap-1 px-2 py-1.5">
                        <Eye className="w-3.5 h-3.5 text-white/50" />
                        <span className="text-[10px] text-white/50">{postData.viewsCount}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Close button always visible on error */}
        {showError && (
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10">
            <X className="w-5 h-5 text-white" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default VideoPlayer;
