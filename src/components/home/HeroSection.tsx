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
    <section
      className="relative py-12 md:py-20 overflow-hidden min-h-[90vh] flex items-center"
      style={{
        backgroundImage: `url(${treeOfGrowth})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Soft overlay for text readability — kept light so tree stays visible */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, rgba(10,61,36,0.55) 0%, rgba(15,81,50,0.45) 40%, rgba(10,61,36,0.6) 100%)",
        }}
      />

      {/* Breathing glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at center 60%, rgba(46,139,87,0.3) 0%, transparent 60%)",
          }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-[15%]"
          style={{
            background: "radial-gradient(ellipse at center 45%, rgba(255,215,0,0.08) 0%, transparent 55%)",
          }}
          animate={{ opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        <TreeParticles />
      </div>

      {/* Text content */}
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

          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-8 font-body leading-relaxed">
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
