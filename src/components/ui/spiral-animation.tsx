import { useEffect, useRef } from "react";

const STAR_COUNT = 200;
const ARMS = 5;

export const SpiralAnimation = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let rotation = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    interface Star {
      arm: number;
      t: number;
      size: number;
      brightness: number;
      pulseSpeed: number;
      pulseOffset: number;
    }

    const stars: Star[] = Array.from({ length: STAR_COUNT }, (_, i) => ({
      arm: i % ARMS,
      t: i / STAR_COUNT,
      size: 1 + Math.random() * 2.5,
      brightness: 0.3 + Math.random() * 0.7,
      pulseSpeed: 1.5 + Math.random() * 2,
      pulseOffset: Math.random() * Math.PI * 2,
    }));

    const draw = (time: number) => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const cx = w / 2;
      const cy = h / 2;
      const maxRadius = Math.min(cx, cy) * 0.85;

      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rotation);

      for (const star of stars) {
        const armAngle = (star.arm / ARMS) * Math.PI * 2;
        const spiralAngle = armAngle + star.t * Math.PI * 3;
        const radius = star.t * maxRadius;
        const x = Math.cos(spiralAngle) * radius;
        const y = Math.sin(spiralAngle) * radius;

        const pulse =
          0.5 + 0.5 * Math.sin(time * 0.001 * star.pulseSpeed + star.pulseOffset);
        const alpha = star.brightness * (0.4 + pulse * 0.6);
        const s = star.size * (0.6 + pulse * 0.4);
        const green = Math.floor(200 + star.brightness * 55);

        ctx.beginPath();
        ctx.arc(x, y, s, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, ${green}, 156, ${alpha})`;
        ctx.shadowColor = `rgba(0, 255, 156, ${alpha * 0.5})`;
        ctx.shadowBlur = 4 + star.brightness * 6;
        ctx.fill();
      }

      ctx.restore();

      // Centre glow
      const glowPulse = 0.7 + 0.3 * Math.sin(time * 0.002);
      const glowRadius = 6 * (1 + glowPulse * 0.3);
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius * 3);
      gradient.addColorStop(0, `rgba(0, 255, 204, ${0.9 * glowPulse})`);
      gradient.addColorStop(1, "rgba(0, 255, 156, 0)");
      ctx.beginPath();
      ctx.arc(cx, cy, glowRadius * 3, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.shadowColor = `rgba(0, 255, 204, ${0.6 * glowPulse})`;
      ctx.shadowBlur = 20 + glowPulse * 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      rotation += (Math.PI * 2) / (120 * 60); // full rotation in ~120s
      animationId = requestAnimationFrame(draw);
    };

    animationId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ position: "absolute", inset: 0 }}
    />
  );
};

export default SpiralAnimation;
