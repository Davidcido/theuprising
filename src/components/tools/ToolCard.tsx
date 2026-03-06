import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface ToolCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
  delay: number;
  onClick: () => void;
}

const ToolCard = ({ icon: Icon, title, description, gradient, delay, onClick }: ToolCardProps) => {
  return (
    <motion.button
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      whileHover={{ y: -6, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="group relative text-left w-full rounded-3xl p-6 backdrop-blur-xl border border-white/20 shadow-lg overflow-hidden transition-shadow duration-300 hover:shadow-2xl"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)",
      }}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{
        background: `radial-gradient(circle at 50% 50%, ${gradient}, transparent 70%)`,
      }} />

      <div className="relative z-10">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-md"
          style={{ background: gradient }}
        >
          <Icon className="w-7 h-7 text-white" />
        </div>
        <h3 className="font-display font-bold text-lg text-white mb-1.5">{title}</h3>
        <p className="text-sm text-white/70 leading-relaxed">{description}</p>
      </div>

      {/* Subtle shine effect */}
      <div className="absolute top-0 left-0 w-full h-full rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
        style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%)" }}
      />
    </motion.button>
  );
};

export default ToolCard;
