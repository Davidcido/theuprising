import { motion } from "framer-motion";
import { Heart, MessageCircle, Sparkles, Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: MessageCircle,
    title: "Talk Freely",
    description: "Share what's on your mind with a companion that truly listens.",
    to: "/chat",
  },
  {
    icon: Sparkles,
    title: "Healing Tools",
    description: "Breathing exercises, journaling prompts, and calming activities.",
    to: "/tools",
  },
  {
    icon: Users,
    title: "Community",
    description: "Connect with others who understand. You're not alone.",
    to: "/community",
  },
  {
    icon: Heart,
    title: "The Uprising",
    description: "Join a global youth movement built on positive energy.",
    to: "/vision",
  },
];

const FeaturesSection = () => (
  <section className="py-16">
    <div className="container mx-auto px-4">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
          Everything You Need
        </h2>
        <p className="text-white/50 max-w-lg mx-auto">
          A safe digital space built for your emotional wellbeing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            viewport={{ once: true }}
          >
            <Link
              to={f.to}
              className="group block p-6 rounded-3xl backdrop-blur-xl border border-white/15 hover:border-white/30 hover:bg-white/10 transition-all"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 100%)",
              }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-md"
                style={{ background: "linear-gradient(135deg, #2E8B57, #0F5132)" }}
              >
                <f.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-display font-semibold text-white mb-2">
                {f.title}
              </h3>
              <p className="text-white/60 text-sm mb-4">{f.description}</p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-300 group-hover:gap-2 transition-all">
                Explore <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;
