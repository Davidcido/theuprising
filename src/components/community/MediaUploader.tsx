import { useState, useRef, useCallback } from "react";
import { Image, X, Loader2, Play, Pause, RotateCcw, FileVideo, Ban, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { compressVideoFile, shouldCompress } from "@/lib/videoCompression";
import { uploadFileWithProgress, UploadState, UploadController } from "@/lib/chunkedUpload";

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
      if (width <= maxWidth && file.size < 500 * 1024) { resolve(file); return; }
      if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => blob ? resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" })) : resolve(file),
        "image/webp", quality
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

type UploadJob = {
  id: string;
  file: File;
  type: "image" | "video";
  state: UploadState;
  controller?: UploadController;
  previewUrl: string;
  duration?: number;
  originalSize: number;
  compressedSize?: number;
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
      <video ref={videoRef} src={media.url} className="w-full max-h-[400px] object-contain bg-black rounded-lg" playsInline onEnded={onRestart} />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
        <div className="flex items-center gap-1.5">
          <button onClick={(e) => { e.stopPropagation(); onTogglePlay(); }} className="p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
            {isPlaying ? <Pause className="w-3 h-3 text-white" /> : <Play className="w-3 h-3 text-white" fill="white" />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); onRestart(); }} className="p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
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
    <button onClick={onRemove} className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 hover:bg-black/80 transition-colors" title="Remove media">
      <X className="w-3.5 h-3.5 text-white" />
    </button>
  </div>
);

const UploadJobCard = ({ job, onCancel, onRetry }: { job: UploadJob; onCancel: () => void; onRetry: () => void }) => {
  const isVideo = job.type === "video";
  return (
    <div className="relative rounded-xl overflow-hidden border border-white/10 bg-white/5 p-2">
      <div className="flex items-center gap-2">
        {isVideo ? (
          <video src={job.previewUrl} className="w-14 h-14 object-cover rounded-lg" muted playsInline preload="metadata" />
        ) : (
          <img src={job.previewUrl} alt="" className="w-14 h-14 object-cover rounded-lg" />
        )}
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-[10px] text-white/50 truncate">{job.file.name}</p>
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="text-white/40">{formatFileSize(job.originalSize)}</span>
            {job.compressedSize != null && job.compressedSize < job.originalSize && (
              <span className="text-emerald-400">→ {formatFileSize(job.compressedSize)}</span>
            )}
          </div>
          <Progress value={job.state.progress} className="h-1" />
          <p className={`text-[10px] ${job.state.status === "error" ? "text-red-400" : job.state.status === "done" ? "text-emerald-400" : "text-amber-400/80"}`}>
            {job.state.status === "compressing" && <Loader2 className="w-2.5 h-2.5 animate-spin inline mr-1" />}
            {job.state.status === "uploading" && <Loader2 className="w-2.5 h-2.5 animate-spin inline mr-1" />}
            {job.state.message}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          {job.state.status === "error" && (
            <button onClick={onRetry} className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors" title="Retry upload">
              <RefreshCw className="w-3 h-3 text-white/60" />
            </button>
          )}
          {(job.state.status === "compressing" || job.state.status === "uploading") && (
            <button onClick={onCancel} className="p-1 rounded-full bg-white/10 hover:bg-red-500/30 transition-colors" title="Cancel upload">
              <Ban className="w-3 h-3 text-white/60" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const MediaUploader = ({ mediaFiles, onMediaChange, maxFiles = 4, disabled }: MediaUploaderProps) => {
  const [activeJobs, setActiveJobs] = useState<UploadJob[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoPreviewRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const controllersRef = useRef<Map<string, UploadController>>(new Map());
  const mediaFilesRef = useRef(mediaFiles);
  mediaFilesRef.current = mediaFiles;
  const onMediaChangeRef = useRef(onMediaChange);
  onMediaChangeRef.current = onMediaChange;

  const updateJob = useCallback((id: string, update: Partial<UploadJob>) => {
    setActiveJobs(prev => prev.map(j => j.id === id ? { ...j, ...update } : j));
  }, []);

  const processFile = useCallback(async (file: File, jobId: string) => {
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) return;
    if (file.size > 100 * 1024 * 1024) {
      updateJob(jobId, { state: { status: "error", progress: 0, message: "File too large (max 100MB)" } });
      return;
    }

    let uploadFile = file;
    let duration = 0;
    let compressedSize: number | undefined;

    if (isImage) {
      updateJob(jobId, { state: { status: "compressing", progress: 30, message: "Compressing image..." } });
      uploadFile = await compressImage(file);
      compressedSize = uploadFile.size;

      updateJob(jobId, { compressedSize });
      updateJob(jobId, { state: { status: "uploading", progress: 0, message: "Uploading..." } });

      const controller = uploadFileWithProgress(
        "community-media",
        uploadFile,
        (state) => {
          updateJob(jobId, { state });
          if (state.status === "done" && state.publicUrl) {
            const newMedia: MediaFile = {
              url: state.publicUrl,
              type: "image",
              file: uploadFile,
              size: uploadFile.size,
            };
            onMediaChangeRef.current([...mediaFilesRef.current, newMedia]);
            setTimeout(() => setActiveJobs(prev => prev.filter(j => j.id !== jobId)), 1000);
            controllersRef.current.delete(jobId);
          }
          if (state.status === "cancelled") {
            setActiveJobs(prev => prev.filter(j => j.id !== jobId));
            controllersRef.current.delete(jobId);
          }
        },
      );
      controllersRef.current.set(jobId, controller);
      updateJob(jobId, { controller });
    } else if (isVideo) {
      // Videos are NOT uploaded here — they're added as local previews
      // and will be uploaded in the background when the post is submitted
      duration = await getVideoDuration(file);
      const previewUrl = URL.createObjectURL(file);
      const newMedia: MediaFile = {
        url: previewUrl,
        type: "video",
        file,
        duration,
        size: file.size,
      };
      onMediaChangeRef.current([...mediaFilesRef.current, newMedia]);
      setActiveJobs(prev => prev.filter(j => j.id !== jobId));
    }
  }, [updateJob]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remaining = maxFiles - mediaFiles.length - activeJobs.length;
    const toUpload = files.slice(0, remaining);

    const newJobs: UploadJob[] = toUpload
      .filter(f => f.type.startsWith("video/") || f.type.startsWith("image/"))
      .map((file) => ({
        id: `job-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        type: (file.type.startsWith("video/") ? "video" : "image") as "image" | "video",
        state: { status: "compressing" as const, progress: 0, message: "Preparing..." },
        previewUrl: URL.createObjectURL(file),
        originalSize: file.size,
      }));

    setActiveJobs(prev => [...prev, ...newJobs]);
    if (fileRef.current) fileRef.current.value = "";

    // Process each file
    for (const job of newJobs) {
      processFile(job.file, job.id);
    }
  };

  const cancelJob = (jobId: string) => {
    const controller = controllersRef.current.get(jobId);
    if (controller) controller.abort();
    setActiveJobs(prev => prev.filter(j => j.id !== jobId));
    controllersRef.current.delete(jobId);
  };

  const retryJob = (jobId: string) => {
    const job = activeJobs.find(j => j.id === jobId);
    if (!job) return;
    updateJob(jobId, { state: { status: "compressing", progress: 0, message: "Retrying..." } });
    processFile(job.file, jobId);
  };

  const removeMedia = (index: number) => {
    if (playingIndex === index) setPlayingIndex(null);
    onMediaChange(mediaFiles.filter((_, i) => i !== index));
  };

  const toggleVideoPlay = (index: number) => {
    const video = videoPreviewRefs.current[index];
    if (!video) return;
    if (playingIndex === index) { video.pause(); setPlayingIndex(null); }
    else {
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

  const isUploading = activeJobs.some(j => j.state.status === "compressing" || j.state.status === "uploading");

  return (
    <div>
      {/* Completed media */}
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
                <button onClick={() => removeMedia(i)} className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 hover:bg-black/80 transition-colors" title="Remove media">
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            )
          ))}
        </div>
      )}

      {/* Active upload jobs */}
      {activeJobs.length > 0 && (
        <div className="space-y-2 mb-2">
          {activeJobs.map(job => (
            <UploadJobCard
              key={job.id}
              job={job}
              onCancel={() => cancelJob(job.id)}
              onRetry={() => retryJob(job.id)}
            />
          ))}
        </div>
      )}

      {mediaFiles.length + activeJobs.length < maxFiles && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={disabled || isUploading}
            className="p-1.5 rounded-full hover:bg-white/10 text-muted-foreground hover:text-emerald-400 transition-colors disabled:opacity-40"
            title="Add image or video (max 100MB)"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*,video/*" multiple onChange={handleFileSelect} className="hidden" />
        </div>
      )}
    </div>
  );
};

export default MediaUploader;
