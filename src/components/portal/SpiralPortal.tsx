import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { SpiralAnimation } from "@/components/ui/spiral-animation";

interface Props {
  onEnter: () => void;
}

const SpiralPortal = ({ onEnter }: Props) => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleEnter = () => {
    onEnter();
    navigate("/");
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black overflow-hidden">
      {/* Spiral animation background */}
      <div className="absolute inset-0 z-0">
        <SpiralAnimation />
      </div>

      {/* Existing UI content */}
      <AnimatePresence>
        {ready && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center pointer-events-none"
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
