import { useState, useRef, useEffect, useCallback } from "react";
import { X, Play, Volume2, VolumeX, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MediaGalleryProps {
  mediaUrls: string[];
  compact?: boolean;
}

// Global tracker: only one video plays at a time
let currentlyPlayingVideo: HTMLVideoElement | null = null;

const generateThumbnail = (url: string): Promise<string> => {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadeddata = () => {
      video.currentTime = 1;
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        } else {
          resolve("");
        }
      } catch {
        resolve("");
      }
    };
    video.onerror = () => resolve("");
    setTimeout(() => resolve(""), 5000);
    video.src = url;
  });
};

const FeedVideo = ({ url, compact }: { url: string; compact?: boolean }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [thumbnail, setThumbnail] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  // Generate thumbnail on mount
  useEffect(() => {
    generateThumbnail(url).then(setThumbnail);
  }, [url]);

  // IntersectionObserver for autoplay/autopause
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        const video = videoRef.current;
        if (!video) return;

        if (entry.isIntersecting) {
          // Pause any other playing video
          if (currentlyPlayingVideo && currentlyPlayingVideo !== video) {
            currentlyPlayingVideo.pause();
          }
          video.play().then(() => {
            currentlyPlayingVideo = video;
            setIsPlaying(true);
          }).catch(() => {});
        } else {
          video.pause();
          setIsPlaying(false);
          if (currentlyPlayingVideo === video) {
            currentlyPlayingVideo = null;
          }
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      const video = videoRef.current;
      if (video && currentlyPlayingVideo === video) {
        currentlyPlayingVideo = null;
      }
    };
  }, []);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    // Tap to unmute/mute
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  return (
    <div ref={containerRef} className="relative" onClick={handleVideoClick}>
      {/* Thumbnail fallback */}
      {!loaded && thumbnail && (
        <img
          src={thumbnail}
          alt=""
          className={`w-full object-cover absolute inset-0 ${compact ? "h-32" : "h-48"}`}
        />
      )}
      {isVisible ? (
        <video
          ref={videoRef}
          src={url}
          className={`w-full object-cover ${compact ? "h-32" : "h-48"}`}
          muted={isMuted}
          playsInline
          loop
          preload="metadata"
          onLoadedData={() => setLoaded(true)}
        />
      ) : (
        <div className={`w-full ${compact ? "h-32" : "h-48"} bg-white/5 flex items-center justify-center`}>
          {thumbnail ? (
            <img src={thumbnail} alt="" className={`w-full object-cover ${compact ? "h-32" : "h-48"}`} />
          ) : (
            <Play className="w-8 h-8 text-white/30" />
          )}
        </div>
      )}
      {/* Mute/unmute indicator */}
      <button
        onClick={toggleMute}
        className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-black/70 transition-colors z-10"
      >
        {isMuted ? (
          <VolumeX className="w-3.5 h-3.5 text-white" />
        ) : (
          <Volume2 className="w-3.5 h-3.5 text-white" />
        )}
      </button>
      {/* Play indicator when paused */}
      {!isPlaying && isVisible && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
          <Play className="w-8 h-8 text-white/80" fill="white" />
        </div>
      )}
    </div>
  );
};

const MediaGallery = ({ mediaUrls, compact }: MediaGalleryProps) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxMuted, setLightboxMuted] = useState(true);

  if (!mediaUrls || mediaUrls.length === 0) return null;

  const isVideo = (url: string) => /\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(url);

  const gridClass = mediaUrls.length === 1
    ? "grid-cols-1"
    : mediaUrls.length === 2
    ? "grid-cols-2"
    : "grid-cols-2";

  return (
    <>
      <div className={`grid gap-1.5 mb-3 ${gridClass}`}>
        {mediaUrls.slice(0, 4).map((url, i) => (
          <div
            key={i}
            className={`relative rounded-xl overflow-hidden cursor-pointer border border-white/10 hover:border-white/20 transition-colors ${
              mediaUrls.length === 3 && i === 0 ? "col-span-2" : ""
            }`}
            onClick={() => setLightboxIndex(i)}
          >
            {isVideo(url) ? (
              <FeedVideo url={url} compact={compact} />
            ) : (
              <img
                src={url}
                alt=""
                className={`w-full object-cover ${compact ? "h-32" : "h-48"}`}
                loading="lazy"
              />
            )}
            {mediaUrls.length > 4 && i === 3 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white text-lg font-bold">+{mediaUrls.length - 4}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && (
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

            {/* Navigation arrows */}
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
              {isVideo(mediaUrls[lightboxIndex]) ? (
                <div className="relative">
                  <video
                    src={mediaUrls[lightboxIndex]}
                    className="w-full max-h-[85vh] rounded-xl"
                    controls
                    autoPlay
                    muted={lightboxMuted}
                  />
                  <button
                    onClick={() => setLightboxMuted(!lightboxMuted)}
                    className="absolute bottom-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                  >
                    {lightboxMuted ? (
                      <VolumeX className="w-4 h-4 text-white" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-white" />
                    )}
                  </button>
                </div>
              ) : (
                <img
                  src={mediaUrls[lightboxIndex]}
                  alt=""
                  className="w-full max-h-[85vh] object-contain rounded-xl"
                />
              )}
            </motion.div>

            {/* Thumbnails */}
            {mediaUrls.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {mediaUrls.map((url, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); }}
                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                      i === lightboxIndex ? "border-emerald-400 scale-110" : "border-white/20 opacity-60"
                    }`}
                  >
                    {isVideo(url) ? (
                      <video src={url} className="w-full h-full object-cover" muted preload="metadata" />
                    ) : (
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    )}
                  </button>
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
