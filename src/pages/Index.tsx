import { motion } from "framer-motion";
import { Heart, MessageCircle, Sparkles, Users, ArrowRight, Globe, HandHeart, Sun } from "lucide-react";
import { Link } from "react-router-dom";
import uprisingLogo from "@/assets/uprising-logo.jpeg";
import treeOfGrowth from "@/assets/tree-of-growth.jpeg";
import instagramIcon from "@/assets/instagram-icon.png";
import snapchatIcon from "@/assets/snapchat-icon.png";
import DailyCheckIn from "@/components/home/DailyCheckIn";
import TreeParticles from "@/components/home/TreeParticles";
import HeroSection from "@/components/home/HeroSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import SocialSection from "@/components/home/SocialSection";

const Index = () => {
  return (
    <div className="min-h-screen pb-24">
      {/* Hero — Tree as atmospheric background */}
      <HeroSection />

      {/* Daily Check-In */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <DailyCheckIn />
        </div>
      </section>

      {/* Features */}
      <FeaturesSection />

      {/* Join the Movement */}
      <SocialSection />

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
