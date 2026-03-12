import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MessageCircle, User, BookOpen } from "lucide-react";
import { isAICompanion, getCompanionAvatar } from "@/lib/companionAvatars";
import { BUILTIN_PERSONAS } from "@/lib/builtinPersonas";

interface CompanionInteractionMenuProps {
  companionName: string;
  children: React.ReactNode;
  onOpenStory?: (companionId: string) => void;
}

const CompanionInteractionMenu = ({ companionName, children, onOpenStory }: CompanionInteractionMenuProps) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const persona = BUILTIN_PERSONAS.find(p => p.name.toLowerCase() === companionName?.toLowerCase());
  if (!persona) return <>{children}</>;

  const handleViewProfile = () => {
    setOpen(false);
    navigate(`/companion/${persona.id}`);
  };

  const handleMessage = () => {
    setOpen(false);
    navigate(`/chat?companion=${persona.id}`);
  };

  const handleViewStory = () => {
    setOpen(false);
    onOpenStory?.(persona.id);
  };

  return (
    <div className="relative" ref={menuRef}>
      <div
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="cursor-pointer"
      >
        {children}
      </div>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-full mt-1.5 z-50 bg-card/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl overflow-hidden min-w-[170px]"
            >
              {/* Companion header */}
              <div className="px-3.5 py-2.5 border-b border-white/10 flex items-center gap-2">
                <img src={persona.avatar_image} alt="" className="w-7 h-7 rounded-full object-cover" />
                <div>
                  <p className="text-xs font-semibold text-foreground">{persona.name}</p>
                  <p className="text-[9px] text-muted-foreground">{persona.role}</p>
                </div>
              </div>

              <button
                onClick={handleViewProfile}
                className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs text-foreground hover:bg-white/10 transition-colors"
              >
                <User className="w-3.5 h-3.5 text-muted-foreground" /> View Profile
              </button>

              {onOpenStory && (
                <button
                  onClick={handleViewStory}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs text-foreground hover:bg-white/10 transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5 text-muted-foreground" /> View Story
                </button>
              )}

              <button
                onClick={handleMessage}
                className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs text-foreground hover:bg-white/10 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" /> Message
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CompanionInteractionMenu;
