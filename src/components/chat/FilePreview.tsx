import { X, FileText, Image as ImageIcon } from "lucide-react";

export type ChatAttachment = {
  file: File;
  preview?: string; // data URL for images
  type: "image" | "document";
};

type FilePreviewProps = {
  attachments: ChatAttachment[];
  onRemove: (index: number) => void;
};

const FilePreview = ({ attachments, onRemove }: FilePreviewProps) => {
  if (attachments.length === 0) return null;

  return (
    <div className="flex gap-2 px-4 py-2 overflow-x-auto">
      {attachments.map((att, i) => (
        <div
          key={i}
          className="relative shrink-0 rounded-xl border border-white/15 bg-white/5 backdrop-blur-md overflow-hidden group"
        >
          {att.type === "image" && att.preview ? (
            <img src={att.preview} alt="Upload" className="w-16 h-16 object-cover" />
          ) : (
            <div className="w-16 h-16 flex flex-col items-center justify-center gap-1 px-1">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <span className="text-[8px] text-muted-foreground truncate w-full text-center">
                {att.file.name.split('.').pop()?.toUpperCase()}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default FilePreview;
