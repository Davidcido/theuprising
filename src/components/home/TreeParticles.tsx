import { motion } from "framer-motion";

const particles = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  // Distribute around the tree area
  x: 10 + Math.random() * 80,
  y: 5 + Math.random() * 90,
  size: Math.random() * 4 + 2,
  duration: 6 + Math.random() * 8,
  delay: Math.random() * 6,
  // Vary color: mix of warm gold, soft green, and white
  color: [
    "rgba(207, 245, 231, 0.6)",
    "rgba(255, 215, 0, 0.4)",
    "rgba(144, 238, 144, 0.5)",
    "rgba(255, 255, 255, 0.4)",
    "rgba(255, 200, 50, 0.35)",
  ][i % 5],
}));

const TreeParticles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
    {particles.map((p) => (
      <motion.div
        key={p.id}
        className="absolute rounded-full"
        style={{
          left: `${p.x}%`,
          top: `${p.y}%`,
          width: p.size,
          height: p.size,
          background: p.color,
          boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
        }}
        animate={{
          y: [-10, -30 - Math.random() * 20, -10],
          x: [-5, 5 + Math.random() * 10, -5],
          opacity: [0, 0.8, 0],
          scale: [0.5, 1, 0.5],
        }}
        transition={{
          duration: p.duration,
          delay: p.delay,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    ))}
  </div>
);

export default TreeParticles;
