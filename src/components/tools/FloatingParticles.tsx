import { motion } from "framer-motion";

const particles = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 4 + 2,
  duration: Math.random() * 8 + 10,
  delay: Math.random() * 5,
}));

const FloatingParticles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {particles.map((p) => (
      <motion.div
        key={p.id}
        className="absolute rounded-full"
        style={{
          left: `${p.x}%`,
          top: `${p.y}%`,
          width: p.size,
          height: p.size,
          background: "rgba(207, 245, 231, 0.3)",
        }}
        animate={{
          y: [-20, 20, -20],
          x: [-10, 10, -10],
          opacity: [0.2, 0.6, 0.2],
        }}
        transition={{
          duration: p.duration,
          delay: p.delay,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    ))}
    {/* Abstract wave SVG */}
    <svg className="absolute bottom-0 left-0 w-full h-48 opacity-10" viewBox="0 0 1440 320" preserveAspectRatio="none">
      <motion.path
        d="M0,224L48,213.3C96,203,192,181,288,186.7C384,192,480,224,576,218.7C672,213,768,171,864,165.3C960,160,1056,192,1152,197.3C1248,203,1344,181,1392,170.7L1440,160L1440,320L0,320Z"
        fill="rgba(207,245,231,0.4)"
        animate={{ d: [
          "M0,224L48,213.3C96,203,192,181,288,186.7C384,192,480,224,576,218.7C672,213,768,171,864,165.3C960,160,1056,192,1152,197.3C1248,203,1344,181,1392,170.7L1440,160L1440,320L0,320Z",
          "M0,192L48,202.7C96,213,192,235,288,229.3C384,224,480,192,576,186.7C672,181,768,203,864,208C960,213,1056,203,1152,186.7C1248,171,1344,149,1392,138.7L1440,128L1440,320L0,320Z",
          "M0,224L48,213.3C96,203,192,181,288,186.7C384,192,480,224,576,218.7C672,213,768,171,864,165.3C960,160,1056,192,1152,197.3C1248,203,1344,181,1392,170.7L1440,160L1440,320L0,320Z",
        ]}}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  </div>
);

export default FloatingParticles;
