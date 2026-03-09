import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PartyPopper } from "lucide-react";

interface FirstPostCelebrationProps {
  show: boolean;
  onDismiss: () => void;
}

const confettiColors = ["#2E8B57", "#FFD700", "#FF6B6B", "#4ECDC4", "#A78BFA", "#F59E0B"];

const ConfettiPiece = ({ delay, x }: { delay: number; x: number }) => (
  <motion.div
    initial={{ y: -20, x, opacity: 1, rotate: 0, scale: 1 }}
    animate={{ y: 300, opacity: 0, rotate: 720, scale: 0.5 }}
    transition={{ duration: 2, delay, ease: "easeOut" }}
    className="absolute top-0 w-2 h-2 rounded-full"
    style={{ backgroundColor: confettiColors[Math.floor(Math.random() * confettiColors.length)], left: `${x}%` }}
  />
);

const FirstPostCelebration = ({ show, onDismiss }: FirstPostCelebrationProps) => {
  const [confetti, setConfetti] = useState<{ id: number; delay: number; x: number }[]>([]);

  useEffect(() => {
    if (show) {
      const pieces = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        delay: Math.random() * 0.5,
        x: Math.random() * 100,
      }));
      setConfetti(pieces);
      const timer = setTimeout(onDismiss, 5000);
      return () => clearTimeout(timer);
    }
  }, [show, onDismiss]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          className="relative p-5 rounded-2xl border border-amber-500/30 mb-4 overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(46,139,87,0.15))" }}
        >
          {/* Confetti */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {confetti.map((c) => (
              <ConfettiPiece key={c.id} delay={c.delay} x={c.x} />
            ))}
          </div>

          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <PartyPopper className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                🎉 Congrats on your first post!
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                You're officially part of the community. Keep sharing your voice!
              </p>
            </div>
            <button
              onClick={onDismiss}
              className="ml-auto text-muted-foreground hover:text-foreground text-xs shrink-0"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FirstPostCelebration;
