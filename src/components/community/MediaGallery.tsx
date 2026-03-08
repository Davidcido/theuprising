import { useState } from "react";
import { X, Play, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MediaGalleryProps {
  mediaUrls: string[];
  compact?: boolean;
}

const MediaGallery = ({ mediaUrls, compact }: MediaGalleryProps) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [mutedVideos, setMutedVideos] = useState<Set<number>>(new Set(mediaUrls.map((_, i) => i)));

  if (!mediaUrls || mediaUrls.length === 0) return null;

  const isVideo = (url: string) => /\.(mp4|webm|mov|avi|mkv)(\?|$)/i.test(url);

  const toggleMute = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setMutedVideos(prev => {
      const n = new Set(prev);
      if (n.has(index)) n.delete(index); else n.add(index);
      return n;
    });
  };

  const gridClass = mediaUrls.length === 1
    ? "grid-cols-1"
    : mediaUrls.length === 2
    ? "grid-cols-2"
    : mediaUrls.length === 3
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
              <>
                <video
                  src={url}
                  className={`w-full object-cover ${compact ? "h-32" : "h-48"}`}
                  muted
                  loop
                  autoPlay
                  playsInline
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <Play className="w-8 h-8 text-white/80" fill="white" />
                </div>
              </>
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
                    muted={mutedVideos.has(lightboxIndex)}
                  />
                  <button
                    onClick={(e) => toggleMute(lightboxIndex, e)}
                    className="absolute bottom-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                  >
                    {mutedVideos.has(lightboxIndex) ? (
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
                      <video src={url} className="w-full h-full object-cover" muted />
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
