import { useState, useRef, useEffect } from "react";
import { X, Play, ChevronLeft, ChevronRight, VolumeX, Volume2, AlertCircle, RefreshCw, Maximize } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import VideoPlayer from "./VideoPlayer";

interface MediaGalleryProps {
  mediaUrls: string[];
  compact?: boolean;
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

const isVideo = (url: string) => /\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(url);
const isValidMediaUrl = (url: string) => url && !url.startsWith("blob:") && (url.startsWith("http://") || url.startsWith("https://"));

// Global tracker: only one video autoplays at a time
let currentlyPlayingFeedVideo: HTMLVideoElement | null = null;

const MAX_FEED_VIDEO_HEIGHT = 700;

/** Feed video — autoplays muted when 60% visible, tap to unmute, expand button for full-screen */
const FeedVideo = ({ url, compact, onTap, isSingle }: { url: string; compact?: boolean; onTap: () => void; isSingle?: boolean }) => {
  
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const touchStartYRef = useRef<number | null>(null);

  // IntersectionObserver for autoplay / autopause
  useEffect(() => {
    const el = containerRef.current;
    if (!el || error) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const video = videoRef.current;
        if (!video) return;
        if (entry.isIntersecting) {
          if (currentlyPlayingFeedVideo && currentlyPlayingFeedVideo !== video) {
            currentlyPlayingFeedVideo.pause();
          }
          video.play().then(() => {
            currentlyPlayingFeedVideo = video;
            setIsPlaying(true);
          }).catch(() => {});
        } else {
          video.pause();
          setIsPlaying(false);
          if (currentlyPlayingFeedVideo === video) currentlyPlayingFeedVideo = null;
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (videoRef.current && currentlyPlayingFeedVideo === videoRef.current) currentlyPlayingFeedVideo = null;
    };
  }, [error, retryCount]);

  const handleMetadata = () => {
    setLoaded(true);
    setError(false);
  };

  const handleError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    console.error("[FeedVideo] Video failed to load:", url, "networkState:", video.networkState, "readyState:", video.readyState, "error:", video.error?.code, video.error?.message);
    // Don't show error for blob URLs or empty URLs — these are expected during upload
    if (!url || url.startsWith("blob:")) return;
    setError(true);
    setLoaded(true);
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setError(false);
    setLoaded(false);
    setRetryCount(c => c + 1);
    // Force reload by setting src again
    const v = videoRef.current;
    if (v) {
      v.src = url + (url.includes("?") ? "&" : "?") + `_r=${Date.now()}`;
      v.load();
    }
  };

  // Container: for single videos, enforce 4:5 vertical aspect ratio for immersive mobile feel.
  // For grid items, use fixed heights.
  const containerClass = isSingle
    ? "relative cursor-pointer group w-full"
    : "relative cursor-pointer group w-full";

  const containerStyle: React.CSSProperties = isSingle
    ? { aspectRatio: "4/5", maxHeight: `${MAX_FEED_VIDEO_HEIGHT}px`, overflow: "clip" }
    : compact
    ? { height: "10rem", overflow: "clip" }
    : { height: "14rem", overflow: "clip" };

  if (error) {
    return (
      <div
        ref={containerRef}
        className="relative w-full flex flex-col items-center justify-center gap-2 bg-black/30 rounded-xl"
        style={isSingle ? { minHeight: "200px", maxHeight: `${MAX_FEED_VIDEO_HEIGHT}px` } : containerStyle}
      >
        <AlertCircle className="w-8 h-8 text-white/50" />
        <p className="text-xs text-white/60">Video failed to load</p>
        <button
          onClick={handleRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 text-xs transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    );
  }

  // Tap toggles mute; dedicated button opens full-screen
  const toggleMute = () => {
    const v = videoRef.current;
    if (v) {
      v.muted = !v.muted;
      setIsMuted(v.muted);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null) return;
    const delta = Math.abs(e.changedTouches[0].clientY - touchStartYRef.current);
    if (delta < 10) {
      toggleMute();
    }
    touchStartYRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      className={containerClass}
      onClick={(e) => {
        // Desktop click — tap to unmute
        if ('ontouchstart' in window) return;
        toggleMute();
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ ...containerStyle, touchAction: "pan-y" }}
    >
      <video
        ref={videoRef}
        key={retryCount}
        src={url}
        crossOrigin="anonymous"
        className="w-full h-full rounded-xl"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          touchAction: "pan-y",
          pointerEvents: "none",
        }}
        muted
        playsInline
        // @ts-ignore webkit attribute for iOS
        webkit-playsinline=""
        loop
        preload="metadata"
        onLoadedMetadata={handleMetadata}
        onError={handleError}
      />
      {/* Mute/unmute indicator */}
      {isPlaying && (
        <button
          className="absolute bottom-2 right-2 p-2 rounded-full bg-black/50 backdrop-blur-sm z-10"
          onClick={(e) => {
            e.stopPropagation();
            toggleMute();
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            e.preventDefault();
            toggleMute();
          }}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-white/80" />
          ) : (
            <Volume2 className="w-4 h-4 text-white/80" />
          )}
        </button>
      )}
      {/* Expand to full-screen button */}
      {isPlaying && (
        <button
          className="absolute bottom-2 left-2 p-2 rounded-full bg-black/50 backdrop-blur-sm z-10"
          onClick={(e) => {
            e.stopPropagation();
            onTap();
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onTap();
          }}
        >
          <Maximize className="w-4 h-4 text-white/80" />
        </button>
      )}
      {/* Play icon when paused */}
      {!isPlaying && loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
          </div>
        </div>
      )}
      {/* Loading state */}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
      {/* Badge */}
      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-sm">
        <span className="text-[10px] text-white/80 font-medium">VIDEO</span>
      </div>
    </div>
  );
};

const MediaGallery = ({ mediaUrls, compact, postData }: MediaGalleryProps) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [videoPlayerUrl, setVideoPlayerUrl] = useState<string | null>(null);

  // Filter out invalid URLs (blob:, empty, non-http)
  const validUrls = mediaUrls.filter(isValidMediaUrl);
  if (validUrls.length === 0) return null;

  const gridClass = validUrls.length === 1
    ? "grid-cols-1"
    : "grid-cols-2";

  const handleMediaClick = (url: string, index: number) => {
    if (isVideo(url)) {
      setVideoPlayerUrl(url);
    } else {
      setLightboxIndex(index);
    }
  };

  return (
    <>
      <div className={`grid gap-1 mb-3 ${gridClass} w-full max-w-full overflow-hidden rounded-2xl`}>
        {validUrls.slice(0, 4).map((url, i) => (
          <div
            key={i}
            className={`relative overflow-hidden border border-white/5 hover:border-white/15 transition-colors ${
              validUrls.length === 3 && i === 0 ? "col-span-2" : ""
            } ${validUrls.length === 1 ? "rounded-2xl" : ""}`}
          >
            {isVideo(url) ? (
              <FeedVideo url={url} compact={compact} isSingle={validUrls.length === 1} onTap={() => handleMediaClick(url, i)} />
            ) : (
              <img
                src={url}
                alt=""
                className={`w-full object-cover cursor-pointer ${
                  validUrls.length === 1
                    ? "aspect-[4/5] max-h-[700px]"
                    : compact ? "h-40" : "h-56"
                }`}
                style={{ display: "block", width: "100%" }}
                loading="lazy"
                onClick={() => handleMediaClick(url, i)}
              />
            )}
            {validUrls.length > 4 && i === 3 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
                <span className="text-white text-lg font-bold">+{validUrls.length - 4}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Full-screen video player */}
      <VideoPlayer
        url={videoPlayerUrl || ""}
        isOpen={!!videoPlayerUrl}
        onClose={() => setVideoPlayerUrl(null)}
        postData={postData}
      />

      {/* Image lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && !isVideo(mediaUrls[lightboxIndex]) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxIndex(null)}
          >
            <button
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
              onClick={() => setLightboxIndex(null)}
            >
              <X className="w-5 h-5 text-white" />
            </button>

            {mediaUrls.length > 1 && lightboxIndex > 0 && (
              <button
                className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
            )}
            {mediaUrls.length > 1 && lightboxIndex < mediaUrls.length - 1 && (
              <button
                className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            )}

            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-4xl max-h-[90vh] w-full"
            >
              <img
                src={mediaUrls[lightboxIndex]}
                alt=""
                className="w-full max-h-[85vh] object-contain rounded-xl"
              />
            </motion.div>

            {/* Thumbnails */}
            {mediaUrls.filter(u => !isVideo(u)).length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {mediaUrls.map((url, i) => (
                  !isVideo(url) && (
                    <button
                      key={i}
                      onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); }}
                      className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                        i === lightboxIndex ? "border-emerald-400 scale-110" : "border-white/20 opacity-60"
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  )
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MediaGallery;
