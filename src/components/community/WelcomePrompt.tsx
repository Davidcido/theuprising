import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, Sparkles, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface WelcomePromptProps {
  isLoggedIn: boolean;
  hasPosted: boolean;
  onOpenAuth?: () => void;
}

const WELCOME_DISMISSED_KEY = "uprising_welcome_dismissed";

const WelcomePrompt = ({ isLoggedIn, hasPosted, onOpenAuth }: WelcomePromptProps) => {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const dismissed = localStorage.getItem(WELCOME_DISMISSED_KEY);
    if (!dismissed) {
      // Show after a short delay for better UX
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(WELCOME_DISMISSED_KEY, "1");
  };

  if (!show || hasPosted) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className="mb-6 relative rounded-2xl border border-emerald-500/20 overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(46,139,87,0.15) 0%, rgba(15,81,50,0.25) 100%)" }}
        >
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
          >
            <X className="w-3.5 h-3.5 text-white/60" />
          </button>

          <div className="p-6 text-center">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-emerald-400" />
              </div>
            </div>

            {isLoggedIn ? (
              <>
                <h3 className="font-display text-lg font-bold text-foreground mb-2">
                  Welcome to The Uprising 🔥
                </h3>
                <p className="text-muted-foreground text-sm mb-4 max-w-sm mx-auto">
                  This is where voices connect. Introduce yourself and make your first post to the community.
                </p>
                <p className="text-muted-foreground/60 text-xs mb-4 italic">
                  Tell the community about yourself. Where are you from? What are you passionate about?
                </p>
                <Button variant="hero" size="sm" onClick={dismiss} className="px-6">
                  <MessageCircle className="w-4 h-4 mr-1.5" />
                  Make Your First Post
                </Button>
              </>
            ) : (
              <>
                <h3 className="font-display text-lg font-bold text-foreground mb-2">
                  Join the Conversation 🔥
                </h3>
                <p className="text-muted-foreground text-sm mb-4 max-w-sm mx-auto">
                  Join the conversation happening right now. Create an account and share your voice.
                </p>
                <Button variant="hero" size="sm" onClick={() => { dismiss(); onOpenAuth?.(); }} className="px-6">
                  <Users className="w-4 h-4 mr-1.5" />
                  Sign Up & Join
                </Button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomePrompt;
