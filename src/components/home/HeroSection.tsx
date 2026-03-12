import { motion } from "framer-motion";
import { Heart, MessageCircle, Sparkles, Globe, HandHeart, Sun } from "lucide-react";
import { Link } from "react-router-dom";
import treeOfGrowth from "@/assets/tree-of-growth.jpeg";
import TreeParticles from "@/components/home/TreeParticles";

const badges = [
  { icon: MessageCircle, label: "Companions" },
  { icon: Globe, label: "Global Community" },
  { icon: HandHeart, label: "Emotional Support" },
  { icon: Sun, label: "Daily Rise" },
];

const HeroSection = () => {
  return (
    <section className="relative py-12 md:py-20 overflow-hidden min-h-[90vh] flex items-center">
      {/* Tree as large atmospheric background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="relative w-full h-full max-w-[1200px]"
        >
          {/* Outer breathing glow */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse at center 60%, rgba(46,139,87,0.4) 0%, rgba(15,81,50,0.15) 40%, transparent 70%)",
              filter: "blur(60px)",
            }}
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.4, 0.7, 0.4],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Inner warm glow */}
          <motion.div
            className="absolute inset-[10%]"
            style={{
              background: "radial-gradient(ellipse at center 55%, rgba(207,245,231,0.25) 0%, rgba(144,238,144,0.1) 35%, transparent 65%)",
              filter: "blur(40px)",
            }}
            animate={{
              scale: [1, 1.12, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
          {/* Golden light through branches */}
          <motion.div
            className="absolute inset-[20%]"
            style={{
              background: "radial-gradient(ellipse at center 45%, rgba(255,215,0,0.12) 0%, rgba(255,200,50,0.06) 35%, transparent 60%)",
              filter: "blur(25px)",
            }}
            animate={{
              scale: [0.9, 1.15, 0.9],
              opacity: [0.15, 0.4, 0.15],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />

          {/* The tree image — large atmospheric background */}
          <img
            src={treeOfGrowth}
            alt=""
            className="absolute inset-0 w-full h-full object-contain opacity-30"
            style={{
              mixBlendMode: "screen",
              filter: "drop-shadow(0 0 60px rgba(46,139,87,0.3))",
            }}
          />

          {/* Floating particles */}
          <TreeParticles />
        </motion.div>
      </div>

      {/* Text content overlaid on tree */}
      <div className="container relative z-10 mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white/80 text-sm font-medium mb-5">
            <Heart className="w-4 h-4" fill="currentColor" />
            You are not alone
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold mb-5 text-white leading-tight">
            Your Safe Space to{" "}
            <span className="bg-gradient-to-r from-emerald-300 to-green-200 bg-clip-text text-transparent">
              Feel & Heal
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-8 font-body leading-relaxed">
            Uprising Companion is a place to breathe, reflect, and grow.
            Talk freely, explore your thoughts, connect with companions,
            and find support in a space built for healing and positive energy.
          </p>

          {/* Feature Badges */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {badges.map((badge) => (
              <motion.div
                key={badge.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white/80 text-sm font-medium"
              >
                <badge.icon className="w-4 h-4 text-emerald-300" />
                {badge.label}
              </motion.div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/chat"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-display font-bold text-white shadow-lg hover:scale-105 transition-transform"
              style={{ background: "linear-gradient(135deg, #2E8B57, #0F5132)" }}
            >
              Start Talking <MessageCircle className="w-5 h-5" />
            </Link>
            <Link
              to="/tools"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-display font-bold text-white bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all"
            >
              Explore the Space <Sparkles className="w-5 h-5" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
