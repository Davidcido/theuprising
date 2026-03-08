import { useState, useRef } from "react";
import { Image, Video, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MediaUploaderProps {
  mediaFiles: { url: string; type: "image" | "video"; file?: File }[];
  onMediaChange: (files: { url: string; type: "image" | "video"; file?: File }[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

const MediaUploader = ({ mediaFiles, onMediaChange, maxFiles = 4, disabled }: MediaUploaderProps) => {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remaining = maxFiles - mediaFiles.length;
    const toUpload = files.slice(0, remaining);
    setUploading(true);

    const newMedia: { url: string; type: "image" | "video" }[] = [];
    for (const file of toUpload) {
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");
      if (!isVideo && !isImage) continue;
      if (file.size > 50 * 1024 * 1024) continue; // 50MB limit

      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("community-media").upload(path, file);
      if (error) continue;

      const { data: urlData } = supabase.storage.from("community-media").getPublicUrl(path);
      newMedia.push({ url: urlData.publicUrl, type: isVideo ? "video" : "image" });
    }

    onMediaChange([...mediaFiles, ...newMedia]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeMedia = (index: number) => {
    onMediaChange(mediaFiles.filter((_, i) => i !== index));
  };

  return (
    <div>
      {mediaFiles.length > 0 && (
        <div className={`grid gap-2 mb-2 ${mediaFiles.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {mediaFiles.map((m, i) => (
            <div key={i} className="relative rounded-xl overflow-hidden border border-white/10">
              {m.type === "image" ? (
                <img src={m.url} alt="" className="w-full h-40 object-cover" />
              ) : (
                <video src={m.url} className="w-full h-40 object-cover" muted />
              )}
              <button
                onClick={() => removeMedia(i)}
                className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {mediaFiles.length < maxFiles && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={disabled || uploading}
            className="p-1.5 rounded-full hover:bg-white/10 text-muted-foreground hover:text-emerald-400 transition-colors disabled:opacity-40"
            title="Add image or video"
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
