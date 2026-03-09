import { X, Send } from "lucide-react";

type Props = {
  file: File;
  previewUrl: string;
  onSend: () => void;
  onCancel: () => void;
  sending: boolean;
};

const ImagePreview = ({ file, previewUrl, onSend, onCancel, sending }: Props) => {
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
          />
        ) : (
          <img src={previewUrl} alt="Preview" className="w-20 h-20 object-cover rounded-lg" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/60 truncate">{file.name}</p>
          <p className="text-[10px] text-white/40">
            {file.size < 1024 * 1024
              ? `${(file.size / 1024).toFixed(0)} KB`
              : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
          </p>
          {isVideo && <p className="text-[10px] text-emerald-400/70 mt-0.5">🎬 Video</p>}
        </div>
        <div className="flex gap-1">
          <button onClick={onCancel} className="p-1.5 rounded-full hover:bg-white/10">
            <X className="w-4 h-4 text-white/40" />
          </button>
          <button
            onClick={onSend}
            disabled={sending}
            className="p-2 rounded-xl text-white disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #2E8B57, #0F5132)" }}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImagePreview;
