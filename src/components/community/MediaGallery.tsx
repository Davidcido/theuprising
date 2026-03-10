import { useState, useRef, useEffect } from "react";
import { X, Play, ChevronLeft, ChevronRight, VolumeX, AlertCircle, RefreshCw } from "lucide-react";
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

/** Feed video — autoplays muted when 60% visible, tapping opens full-screen player */
const FeedVideo = ({ url, compact, onTap, isSingle }: { url: string; compact?: boolean; onTap: () => void; isSingle?: boolean }) => {
  console.log("[FeedVideo] Rendering with URL:", url);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

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
    console.error("[FeedVideo] Video failed to load:", url, "networkState:", video.networkState, "error:", video.error?.code, video.error?.message);
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

  // Container: for single videos, let height be auto (aspect-ratio driven) with max-height.
  // For grid items, use fixed heights.
  const containerClass = isSingle
    ? "relative cursor-pointer group w-full"
    : "relative cursor-pointer group w-full";

  const containerStyle: React.CSSProperties = isSingle
    ? { maxHeight: `${MAX_FEED_VIDEO_HEIGHT}px`, overflow: "hidden" }
    : compact
    ? { height: "10rem" }
    : { height: "14rem" };

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

  return (
    <div ref={containerRef} className={containerClass} onClick={onTap} style={containerStyle}>
      <video
        ref={videoRef}
        key={retryCount} // force remount on retry
        src={url}
        className="w-full rounded-xl"
        style={{
          width: "100%",
          height: isSingle ? "auto" : "100%",
          maxHeight: isSingle ? `${MAX_FEED_VIDEO_HEIGHT}px` : undefined,
          objectFit: "cover",
          display: "block",
        }}
        muted
        playsInline
        loop
        preload="metadata"
        onLoadedMetadata={handleMetadata}
        onError={handleError}
      />
      {/* Muted indicator */}
      {isPlaying && (
        <div className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/50 backdrop-blur-sm pointer-events-none">
          <VolumeX className="w-3 h-3 text-white/70" />
        </div>
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
        {mediaUrls.slice(0, 4).map((url, i) => (
          <div
            key={i}
            className={`relative overflow-hidden border border-white/5 hover:border-white/15 transition-colors ${
              mediaUrls.length === 3 && i === 0 ? "col-span-2" : ""
            } ${mediaUrls.length === 1 ? "rounded-2xl" : ""}`}
          >
            {isVideo(url) ? (
              <FeedVideo url={url} compact={compact} isSingle={mediaUrls.length === 1} onTap={() => handleMediaClick(url, i)} />
            ) : (
              <img
                src={url}
                alt=""
                className={`w-full object-cover cursor-pointer ${mediaUrls.length === 1 ? "max-h-[700px]" : compact ? "h-40" : "h-56"}`}
                style={{ display: "block", width: "100%" }}
                loading="lazy"
                onClick={() => handleMediaClick(url, i)}
              />
            )}
            {mediaUrls.length > 4 && i === 3 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
                <span className="text-white text-lg font-bold">+{mediaUrls.length - 4}</span>
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
