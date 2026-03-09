import { useState, useRef } from "react";
import { Image, X, Loader2, Play, Pause, RotateCcw, FileVideo } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { compressVideoFile, shouldCompress } from "@/lib/videoCompression";

interface MediaFile {
  url: string;
  type: "image" | "video";
  file?: File;
  duration?: number;
  size?: number;
}

interface MediaUploaderProps {
  mediaFiles: MediaFile[];
  onMediaChange: (files: MediaFile[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

const compressImage = (file: File, maxWidth = 1920, quality = 0.8): Promise<File> => {
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width <= maxWidth && file.size < 500 * 1024) {
        resolve(file);
        return;
      }
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }));
          } else {
            resolve(file);
          }
        },
        "image/webp",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
};

const getVideoDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    const url = URL.createObjectURL(file);
    video.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(video.duration); };
    video.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
    video.src = url;
  });
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const VideoPreview = ({ media, index, onRemove, onTogglePlay, onRestart, isPlaying, videoRef }: {
  media: MediaFile;
  index: number;
  onRemove: () => void;
  onTogglePlay: () => void;
  onRestart: () => void;
  isPlaying: boolean;
  videoRef: (el: HTMLVideoElement | null) => void;
}) => (
  <div className="relative rounded-xl overflow-hidden border border-white/10">
    <div className="relative">
      <video
        ref={videoRef}
        src={media.url}
        className="w-full h-40 object-cover"
        playsInline
        onEnded={onRestart}
      />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
            className="p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            {isPlaying ? <Pause className="w-3 h-3 text-white" /> : <Play className="w-3 h-3 text-white" fill="white" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRestart(); }}
            className="p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <RotateCcw className="w-3 h-3 text-white" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 text-[10px] text-white/70">
            <FileVideo className="w-3 h-3" />
            {media.duration ? formatDuration(media.duration) : ""}
            {media.size ? ` · ${formatFileSize(media.size)}` : ""}
          </div>
        </div>
      </div>
    </div>
    <button
      onClick={onRemove}
      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
      title="Remove media"
    >
      <X className="w-3.5 h-3.5 text-white" />
    </button>
  </div>
);

const MediaUploader = ({ mediaFiles, onMediaChange, maxFiles = 4, disabled }: MediaUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const videoPreviewRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remaining = maxFiles - mediaFiles.length;
    const toUpload = files.slice(0, remaining);
    setUploading(true);
    setUploadProgress(0);

    const newMedia: MediaFile[] = [];
    const totalFiles = toUpload.length;

    for (let idx = 0; idx < toUpload.length; idx++) {
      const file = toUpload[idx];
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      if (!isVideo && !isImage) continue;
      if (file.size > 100 * 1024 * 1024) {
        setUploadStatus("File too large (max 100MB)");
        continue;
      }

      let uploadFile = file;
      let duration = 0;

      if (isImage) {
        setUploadStatus(`Compressing image ${idx + 1}/${totalFiles}...`);
        uploadFile = await compressImage(file);
      } else if (isVideo) {
        setUploadStatus(`Processing video ${idx + 1}/${totalFiles}...`);
        duration = await getVideoDuration(file);
        if (shouldCompress(file)) {
          setUploadStatus(`Optimizing video ${idx + 1}/${totalFiles}...`);
          uploadFile = await compressVideoFile(file, {
            maxDimension: 1920,
            onProgress: (p) => setUploadProgress(((idx + p / 100) / totalFiles) * 50),
          });
        }
      }

      setUploadStatus(`Uploading ${idx + 1}/${totalFiles}...`);
      const ext = isImage ? "webp" : uploadFile.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("community-media").upload(path, uploadFile);
      if (error) continue;

      const { data: urlData } = supabase.storage.from("community-media").getPublicUrl(path);
      newMedia.push({
        url: urlData.publicUrl,
        type: isVideo ? "video" : "image",
        file: uploadFile,
        duration,
        size: uploadFile.size,
      });
      setUploadProgress(((idx + 1) / totalFiles) * 100);
    }

    onMediaChange([...mediaFiles, ...newMedia]);
    setUploadStatus(newMedia.length > 0 ? "Upload complete!" : "");
    setUploading(false);
    setTimeout(() => setUploadStatus(""), 2000);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeMedia = (index: number) => {
    if (playingIndex === index) setPlayingIndex(null);
    onMediaChange(mediaFiles.filter((_, i) => i !== index));
  };

  const toggleVideoPlay = (index: number) => {
    const video = videoPreviewRefs.current[index];
    if (!video) return;
    if (playingIndex === index) {
      video.pause();
      setPlayingIndex(null);
    } else {
      if (playingIndex !== null) videoPreviewRefs.current[playingIndex]?.pause();
      video.play();
      setPlayingIndex(index);
    }
  };

  const restartVideo = (index: number) => {
    const video = videoPreviewRefs.current[index];
    if (!video) return;
    video.currentTime = 0;
    video.play();
    setPlayingIndex(index);
  };

  return (
    <div>
      {mediaFiles.length > 0 && (
        <div className={`grid gap-2 mb-2 ${mediaFiles.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {mediaFiles.map((m, i) => (
            m.type === "video" ? (
              <VideoPreview
                key={i}
                media={m}
                index={i}
                onRemove={() => removeMedia(i)}
                onTogglePlay={() => toggleVideoPlay(i)}
                onRestart={() => restartVideo(i)}
                isPlaying={playingIndex === i}
                videoRef={(el) => { videoPreviewRefs.current[i] = el; }}
              />
            ) : (
              <div key={i} className="relative rounded-xl overflow-hidden border border-white/10">
                <img src={m.url} alt="" className="w-full h-40 object-cover" />
                <button
                  onClick={() => removeMedia(i)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
                  title="Remove media"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            )
          ))}
        </div>
      )}

      {uploading && (
        <div className="mb-2 space-y-1">
          <Progress value={uploadProgress} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground">{uploadStatus}</p>
        </div>
      )}

      {!uploading && uploadStatus && (
        <p className="text-[10px] text-emerald-400 mb-1">{uploadStatus}</p>
      )}

      {mediaFiles.length < maxFiles && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={disabled || uploading}
            className="p-1.5 rounded-full hover:bg-white/10 text-muted-foreground hover:text-emerald-400 transition-colors disabled:opacity-40"
            title="Add image or video (max 100MB)"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}
    </div>
  );
};

export default MediaUploader;
