import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  Heart, MessageCircle, Share2, Repeat2, Eye, Loader2,
} from "lucide-react";

interface VideoPlayerProps {
  url: string;
  isOpen: boolean;
  onClose: () => void;
  // Optional interaction props
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
  if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const VideoPlayer = ({ url, isOpen, onClose, postData }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState(false);

  // Auto-play on open
  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.play().then(() => {
        setPlaying(true);
        setBuffering(false);
      }).catch(() => setPlaying(false));
    }
    return () => { hideTimer.current && clearTimeout(hideTimer.current); };
  }, [isOpen]);

  // Auto-hide controls
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    hideTimer.current && clearTimeout(hideTimer.current);
    if (playing) {
      hideTimer.current = setTimeout(() => setShowControls(false), 3000);
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
      if (e.key === "m") toggleMute();
      if (e.key === "ArrowRight") seek(5);
      if (e.key === "ArrowLeft") seek(-5);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, playing]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const seek = (delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + delta));
  };

  const handleProgressClick = (e: React.MouseEvent) => {
    const bar = progressRef.current;
    const v = videoRef.current;
    if (!bar || !v || !v.duration) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = pct * v.duration;
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
          className="w-full h-full object-contain"
          playsInline
          muted={muted}
          loop
          onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
          onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
          onWaiting={() => setBuffering(true)}
          onPlaying={() => setBuffering(false)}
          onCanPlay={() => setBuffering(false)}
          onClick={(e) => { e.stopPropagation(); togglePlay(); resetHideTimer(); }}
        />

        {/* Buffering spinner */}
        {buffering && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
        )}

        {/* Large play/pause indicator */}
        {!playing && !buffering && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-black/40 flex items-center justify-center">
              <Play className="w-8 h-8 text-white ml-1" fill="white" />
            </div>
          </div>
        )}

        {/* Controls overlay */}
        <AnimatePresence>
          {showControls && (
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
                  <div className="flex items-center gap-3">
                    <button onClick={togglePlay} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                      {playing ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" fill="white" />}
                    </button>
                    <button onClick={toggleMute} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                      {muted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
                    </button>
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
      </motion.div>
    </AnimatePresence>
  );
};

export default VideoPlayer;
