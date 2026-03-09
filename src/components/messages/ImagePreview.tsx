import { useState, useEffect, useRef } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type Props = {
  file: File;
  previewUrl: string;
  onSend: () => void;
  onCancel: () => void;
  sending: boolean;
  compressing?: boolean;
  compressionProgress?: number;
  compressedSize?: number;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const ImagePreview = ({ file, previewUrl, onSend, onCancel, sending, compressing, compressionProgress, compressedSize }: Props) => {
  const isVideo = file.type.startsWith("video/");

  return (
    <div className="mx-1 mb-2 p-3 rounded-xl bg-white/5 border border-white/10">
      <div className="flex items-start gap-3">
        {isVideo ? (
          <video
            src={previewUrl}
            className="w-20 h-20 object-cover rounded-lg"
            muted
            playsInline
            preload="metadata"
            controls
          />
        ) : (
          <img src={previewUrl} alt="Preview" className="w-20 h-20 object-cover rounded-lg" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/60 truncate">{file.name}</p>
          <p className="text-[10px] text-white/40">
            Original: {formatSize(file.size)}
            {compressedSize != null && compressedSize < file.size && (
              <span className="text-emerald-400"> → {formatSize(compressedSize)}</span>
            )}
          </p>
          {isVideo && !compressing && <p className="text-[10px] text-emerald-400/70 mt-0.5">🎬 Video</p>}
          {compressing && (
            <div className="mt-1.5 space-y-1">
              <p className="text-[10px] text-amber-400/80 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Optimizing video...
              </p>
              {compressionProgress != null && (
                <Progress value={compressionProgress} className="h-1" />
              )}
            </div>
          )}
        </div>
        <div className="flex gap-1">
          <button onClick={onCancel} disabled={compressing} className="p-1.5 rounded-full hover:bg-white/10 disabled:opacity-40">
            <X className="w-4 h-4 text-white/40" />
          </button>
          <button
            onClick={onSend}
            disabled={sending || compressing}
            className="p-2 rounded-xl text-white disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #2E8B57, #0F5132)" }}
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImagePreview;
