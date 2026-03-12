import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

/* ───── spiral config ───── */
const PARTICLE_COUNT = 220;
const ARMS = 5;
const MAX_RADIUS_RATIO = 0.42;
const ROTATION_SPEED = 0.0004;
const PULSE_SPEED = 0.0015;

interface Particle {
  arm: number;
  dist: number;       // 0-1 normalised distance from centre
  angleOffset: number; // extra angle jitter
  size: number;
  brightness: number;
  speed: number;       // individual rotation multiplier
}

function createParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    arm: Math.floor(Math.random() * ARMS),
    dist: Math.random(),
    angleOffset: (Math.random() - 0.5) * 0.35,
    size: 1 + Math.random() * 2.4,
    brightness: 0.3 + Math.random() * 0.7,
    speed: 0.7 + Math.random() * 0.6,
  }));
}

interface Props {
  onEnter: () => void;
}

const SpiralPortal = ({ onEnter }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const particles = useRef(createParticles());
  const frameRef = useRef(0);
  const startTime = useRef(Date.now());

  /* ── canvas render loop ── */
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.min(w, h) * MAX_RADIUS_RATIO;
    const elapsed = Date.now() - startTime.current;

    /* background — radial gradient */
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7);
    bg.addColorStop(0, "#052e1a");
    bg.addColorStop(1, "#010c07");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    /* pulse factor */
    const pulse = 1 + Math.sin(elapsed * PULSE_SPEED) * 0.06;

    /* draw particles */
    ctx.save();
    for (const p of particles.current) {
      const armAngle = (p.arm / ARMS) * Math.PI * 2;
      const spiralAngle = p.dist * Math.PI * 3; // spiral winding
      const angle = armAngle + spiralAngle + p.angleOffset + elapsed * ROTATION_SPEED * p.speed;
      const r = p.dist * maxR * pulse;

      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;

      const alpha = p.brightness * (0.5 + p.dist * 0.5);
      const green = Math.floor(200 + p.brightness * 55);

      ctx.shadowColor = `rgba(0, ${green}, 156, ${alpha * 0.6})`;
      ctx.shadowBlur = 8;
      ctx.fillStyle = `rgba(0, ${green}, 156, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    /* centre glow dot */
    ctx.save();
    ctx.shadowColor = "#00ffcc";
    ctx.shadowBlur = 15 + Math.sin(elapsed * 0.002) * 5;
    const dotGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 6);
    dotGrad.addColorStop(0, "rgba(0, 255, 204, 0.9)");
    dotGrad.addColorStop(1, "rgba(0, 255, 156, 0)");
    ctx.fillStyle = dotGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    /* trailing glow ring */
    ctx.save();
    ctx.strokeStyle = `rgba(0, 255, 166, ${0.04 + Math.sin(elapsed * 0.001) * 0.02})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, maxR * pulse * 0.95, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    frameRef.current = requestAnimationFrame(render);
  }, []);

  /* ── setup ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };

    resize();
    window.addEventListener("resize", resize);
    frameRef.current = requestAnimationFrame(render);

    const timer = setTimeout(() => setReady(true), 800);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frameRef.current);
      clearTimeout(timer);
    };
  }, [render]);

  const handleEnter = () => {
    onEnter();
    navigate("/daily-rise");
  };

  return (
    <div className="fixed inset-0 z-[200]" style={{ background: "#021a0f" }}>
      <canvas ref={canvasRef} className="absolute inset-0" />

      <AnimatePresence>
        {ready && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none"
          >
            <h1
              className="text-4xl md:text-5xl font-display font-bold mb-3 pointer-events-none select-none"
              style={{
                color: "#e0fff0",
                textShadow: "0 0 30px rgba(0,255,156,0.3), 0 0 60px rgba(0,255,156,0.15)",
              }}
            >
              Welcome to Uprising
            </h1>
            <p
              className="text-sm md:text-base mb-10 pointer-events-none select-none"
              style={{ color: "rgba(0,255,166,0.5)" }}
            >
              Your portal awaits
            </p>
            <button
              onClick={handleEnter}
              className="pointer-events-auto px-8 py-3.5 rounded-full font-display font-semibold text-base transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(135deg, rgba(0,255,156,0.15), rgba(0,255,156,0.05))",
                border: "1px solid rgba(0,255,156,0.3)",
                color: "#00ff9c",
                textShadow: "0 0 10px #00ff9c",
                boxShadow: "0 0 25px rgba(0,255,156,0.15), inset 0 0 20px rgba(0,255,156,0.05)",
              }}
            >
              Enter the Rise
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SpiralPortal;
