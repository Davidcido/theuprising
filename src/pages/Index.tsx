import { motion } from "framer-motion";
import { Heart, MessageCircle, Sparkles, Users, ArrowRight, Bot, Globe, HandHeart, Sun } from "lucide-react";
import { Link } from "react-router-dom";
import uprisingLogo from "@/assets/uprising-logo.jpeg";
import instagramIcon from "@/assets/instagram-icon.png";
import snapchatIcon from "@/assets/snapchat-icon.png";
import DailyCheckIn from "@/components/home/DailyCheckIn";

const features = [
  {
    icon: MessageCircle,
    title: "Talk Freely",
    description: "Share what's on your mind with an AI companion that truly listens.",
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

const Index = () => {
  return (
    <div className="min-h-screen pb-24">
      {/* Hero */}
      <section className="relative py-20 md:py-32">
        <div className="container relative mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="flex justify-center mb-8"
          >
            <div className="relative">
              <div
                className="absolute inset-0 rounded-3xl blur-2xl opacity-50"
                style={{ background: "radial-gradient(circle, rgba(207,245,231,0.4), transparent)" }}
              />
              <img
                src={uprisingLogo}
                alt="The Uprising"
                className="relative w-28 h-28 rounded-3xl object-cover shadow-xl"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white/80 text-sm font-medium mb-6">
              <Heart className="w-4 h-4" fill="currentColor" />
              You are not alone
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold mb-6 text-white leading-tight">
              Your Safe Space to{" "}
              <span className="bg-gradient-to-r from-emerald-300 to-green-200 bg-clip-text text-transparent">
                Feel & Heal
              </span>
            </h1>

            <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 font-body">
              Uprising Companion is your AI-powered emotional support friend and community space. Talk freely, share your story, connect with others, and grow in a place built on empathy, creativity, and positive energy.
            </p>

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
                Explore Tools <Sparkles className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Daily Check-In */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <DailyCheckIn />
        </div>
      </section>

      {/* Features */}
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
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-md"
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

      {/* Join the Movement */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
              Join the Movement Beyond the App
            </h2>
            <p className="text-white/50 mb-10 leading-relaxed">
              Stay connected with the Uprising community outside the platform. Follow us on social media for daily encouragement, updates, and stories from the community.
            </p>

            <div className="flex justify-center gap-10 mb-8">
              <a
                href="https://www.instagram.com/p/DVMXGIfDHo6/?igsh=eGM1dmV1emwzdzB4"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-3"
              >
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_30px_-5px_hsl(155_60%_38%/0.5)] border border-white/15"
                  style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))" }}
                >
                  <img src={instagramIcon} alt="Instagram" className="w-11 h-11 object-contain" />
                </div>
                <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">Instagram</span>
              </a>

              <a
                href="https://story.snapchat.com/u/the_uprising26?share_id=3fz0ORNnS76sy1nkSfPYaw&locale=en_NG"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-3"
              >
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_30px_-5px_hsl(155_60%_38%/0.5)] border border-white/15"
                  style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))" }}
                >
                  <img src={snapchatIcon} alt="Snapchat" className="w-11 h-11 object-contain" />
                </div>
                <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">Snapchat</span>
              </a>
            </div>

            <p className="text-white/50 text-sm">
              Tag us and share your story with the community 💚
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img src={uprisingLogo} alt="The Uprising" className="w-7 h-7 rounded-lg object-cover" />
            <span className="font-display font-bold text-white">Uprising Companion</span>
          </div>
          <p className="text-sm text-white/40">
            A safe space for every young person. We rise together. 💚
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
