import { motion } from "framer-motion";
import { Heart, MessageCircle, Sparkles, Users, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import DailyCheckIn from "@/components/home/DailyCheckIn";

const features = [
  {
    icon: MessageCircle,
    title: "Talk Freely",
    description: "Share what's on your mind with an AI companion that truly listens.",
    color: "bg-uprising-green-light text-uprising-green-dark",
    to: "/chat",
  },
  {
    icon: Sparkles,
    title: "Healing Tools",
    description: "Breathing exercises, journaling prompts, and calming activities.",
    color: "bg-uprising-blue-light text-uprising-blue",
    to: "/tools",
  },
  {
    icon: Users,
    title: "Community",
    description: "Connect with others who understand. You're not alone.",
    color: "bg-uprising-orange-light text-uprising-orange",
    to: "/community",
  },
  {
    icon: Heart,
    title: "The Uprising",
    description: "Join a global youth movement built on positive energy.",
    color: "bg-uprising-purple-light text-uprising-purple",
    to: "/vision",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-calm opacity-50" />
        <div className="absolute top-20 right-10 w-72 h-72 rounded-full bg-uprising-green-light/40 blur-3xl animate-float" />
        <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-uprising-blue-light/30 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

        <div className="container relative mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-uprising-green-light text-uprising-green-dark text-sm font-medium mb-6">
              <Heart className="w-4 h-4" fill="currentColor" />
              You are not alone
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold mb-6 text-foreground leading-tight">
              Your Safe Space to{" "}
              <span className="text-gradient-hero">Feel & Heal</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 font-body">
              Uprising Companion is your AI-powered emotional support friend.
              Talk freely, find calm, and connect with a community that cares.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="lg" asChild>
                <Link to="/chat">
                  Start Talking <MessageCircle className="w-4 h-4" />
                </Link>
              </Button>
              <Button variant="soft" size="lg" asChild>
                <Link to="/tools">
                  Explore Tools <Sparkles className="w-4 h-4" />
                </Link>
              </Button>
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
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Everything You Need
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              A safe digital space built for your emotional wellbeing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
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
                  className="group block p-6 rounded-2xl bg-card border border-border hover:shadow-medium transition-all"
                >
                  <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                    <f.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-display font-semibold text-foreground mb-2">
                    {f.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">{f.description}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                    Explore <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-md bg-gradient-hero flex items-center justify-center">
              <Heart className="w-3 h-3 text-primary-foreground" fill="currentColor" />
            </div>
            <span className="font-display font-bold text-foreground">Uprising Companion</span>
          </div>
          <p className="text-sm text-muted-foreground">
            A safe space for every young person. We rise together. 💚
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
