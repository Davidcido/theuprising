/**
 * High-quality browser-based video compression using canvas + MediaRecorder.
 * Uses VP9 codec at quality-optimised bitrates, capping resolution to maintain
 * HD clarity while reducing file size.
 */

export type CompressionOptions = {
  /** Max dimension (width or height). Default 1920 for community, 1280 for DM */
  maxDimension?: number;
  /** Target video bitrate in bps. Default auto-calculated from resolution */
  videoBitrate?: number;
  /** Frame rate. Default 30 */
  fps?: number;
  /** Progress callback 0-100 */
  onProgress?: (percent: number) => void;
};

const getOptimalBitrate = (width: number, height: number): number => {
  const pixels = width * height;
  // ~8 Mbps for 1080p, ~4 Mbps for 720p, scaling proportionally
  if (pixels >= 1920 * 1080) return 8_000_000;
  if (pixels >= 1280 * 720) return 4_000_000;
  if (pixels >= 854 * 480) return 2_500_000;
  return 1_500_000;
};

export const compressVideoFile = (
  file: File,
  options: CompressionOptions = {}
): Promise<File> => {
  const {
    maxDimension = 1920,
    fps = 30,
    onProgress,
  } = options;

  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    const srcUrl = URL.createObjectURL(file);
    video.src = srcUrl;

    video.onloadedmetadata = () => {
      let w = video.videoWidth;
      let h = video.videoHeight;

      // Only downscale if exceeding maxDimension
      if (w > maxDimension || h > maxDimension) {
        const scale = maxDimension / Math.max(w, h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);
      }
      // Ensure even dimensions for codec compatibility
      w = w % 2 === 0 ? w : w - 1;
      h = h % 2 === 0 ? h : h - 1;

      const videoBitrate = options.videoBitrate ?? getOptimalBitrate(w, h);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      const stream = canvas.captureStream(fps);

      // Attempt to capture audio track
      try {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaElementSource(video);
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(dest);
        source.connect(audioCtx.destination);
        dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
      } catch {
        // No audio or unsupported — continue without
      }

      // Prefer VP9 for better quality-per-bit, fall back to VP8
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
        ? "video/webm;codecs=vp8"
        : "video/webm";

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: videoBitrate,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        URL.revokeObjectURL(srcUrl);
        const blob = new Blob(chunks, { type: "video/webm" });
        // Only use compressed version if it's actually smaller
        if (blob.size >= file.size) {
          resolve(file);
        } else {
          resolve(
            new File([blob], file.name.replace(/\.[^.]+$/, ".webm"), {
              type: "video/webm",
            })
          );
        }
      };

      const duration = video.duration;
      let lastProg = 0;
      recorder.start(100);
      video.play();

      const drawFrame = () => {
        if (video.ended || video.paused) {
          recorder.stop();
          return;
        }
        ctx.drawImage(video, 0, 0, w, h);
        if (onProgress) {
          const p = Math.min(100, (video.currentTime / duration) * 100);
          if (p - lastProg > 1) {
            lastProg = p;
            onProgress(Math.round(p));
          }
        }
        requestAnimationFrame(drawFrame);
      };
      drawFrame();
      video.onended = () => recorder.stop();
    };

    video.onerror = () => {
      URL.revokeObjectURL(srcUrl);
      resolve(file);
    };
  });
};

/** Quick check: should we bother compressing? */
export const shouldCompress = (file: File, thresholdMB = 5): boolean => {
  return file.type.startsWith("video/") && file.size > thresholdMB * 1024 * 1024;
};
