import { supabase } from "@/integrations/supabase/client";

const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks

export type UploadState = {
  status: "compressing" | "uploading" | "processing" | "done" | "error" | "cancelled";
  progress: number; // 0-100
  message: string;
  publicUrl?: string;
  error?: string;
};

export type UploadController = {
  abort: () => void;
};

/**
 * Upload a file to Supabase storage with progress tracking.
 * Uses single upload (Supabase SDK handles chunking internally for large files).
 * Returns a controller to abort the upload.
 */
export const uploadFileWithProgress = (
  bucket: string,
  file: File,
  onState: (state: UploadState) => void,
): UploadController => {
  let aborted = false;
  const abortController = { abort: () => { aborted = true; } };

  const run = async () => {
    if (aborted) {
      onState({ status: "cancelled", progress: 0, message: "Upload cancelled" });
      return;
    }

    // Preserve original file extension for browser compatibility (especially Safari)
    const nameParts = file.name.split(".");
    const ext = nameParts.length > 1 ? nameParts.pop()!.toLowerCase() : "bin";
    const uniqueId = Math.random().toString(36).slice(2, 8) || "x";
    const path = `${Date.now()}-${uniqueId}.${ext}`;
    console.log("[Upload] File:", file.name, "→ Storage path:", path, "Content-Type:", file.type);

    // For files larger than chunk size, upload in chunks via XHR for progress
    if (file.size > CHUNK_SIZE) {
      try {
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        let uploadedBytes = 0;

        // We use a single XHR upload to get progress events
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

        const result = await new Promise<boolean>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          
          xhr.upload.onprogress = (e) => {
            if (aborted) { xhr.abort(); return; }
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              onState({
                status: "uploading",
                progress: pct,
                message: `Uploading video... ${pct}%`,
              });
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(true);
            } else {
              reject(new Error(`Upload failed: ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error("Network error"));
          xhr.onabort = () => {
            onState({ status: "cancelled", progress: 0, message: "Upload cancelled" });
            resolve(false);
          };

          xhr.open("POST", `${supabaseUrl}/storage/v1/object/${bucket}/${path}`);
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.setRequestHeader("x-upsert", "true");
          xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
          const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          xhr.setRequestHeader("apikey", anonKey);
          xhr.send(file);

          // Store abort handler
          abortController.abort = () => {
            aborted = true;
            xhr.abort();
          };
        });

        if (!result) return;
      } catch (err: any) {
        if (aborted) {
          onState({ status: "cancelled", progress: 0, message: "Upload cancelled" });
          return;
        }
        onState({ status: "error", progress: 0, message: "Upload failed. Tap to retry.", error: err.message });
        return;
      }
    } else {
      // Small file — use SDK directly
      onState({ status: "uploading", progress: 10, message: "Uploading..." });
      const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type || "application/octet-stream", upsert: true });
      if (aborted) {
        onState({ status: "cancelled", progress: 0, message: "Upload cancelled" });
        return;
      }
      if (error) {
        onState({ status: "error", progress: 0, message: "Upload failed. Tap to retry.", error: error.message });
        return;
      }
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    console.log("[Upload] Generated public URL:", urlData.publicUrl);
    onState({
      status: "done",
      progress: 100,
      message: "Upload complete!",
      publicUrl: urlData.publicUrl,
    });
  };

  run();
  return abortController;
};
