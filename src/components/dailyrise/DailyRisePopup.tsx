import { motion, AnimatePresence } from "framer-motion";
import { Sun, ArrowRight, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDailyRiseContent } from "@/hooks/useDailyRiseContent";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  open: boolean;
  onClose: () => void;
}

const DailyRisePopup = ({ open, onClose }: Props) => {
  const navigate = useNavigate();
  const { data: cards, isLoading } = useDailyRiseContent();

  const handleExploreMore = () => {
    onClose();
    navigate("/daily-rise");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[100] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            className="relative w-full max-w-md max-h-[85vh] rounded-3xl border border-white/15 shadow-2xl overflow-hidden"
            style={{ background: "linear-gradient(180deg, rgba(15,81,50,0.95) 0%, rgba(10,50,30,0.98) 100%)" }}
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <button onClick={onClose} className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>

            <div className="px-6 pt-8 pb-4 text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }} className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 shadow-lg" style={{ background: "linear-gradient(135deg, #2E8B57, #0F5132)" }}>
                <Sun className="w-7 h-7 text-yellow-300" />
              </motion.div>
              <h2 className="text-2xl font-display font-bold text-white mb-1">Daily Rise</h2>
              <p className="text-sm text-white/50">Your daily update from the Uprising community.</p>
            </div>

            <ScrollArea className="h-[calc(85vh-260px)] px-4">
              <div className="space-y-3 pb-4 px-2">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-2xl bg-white/5" />
                  ))
                ) : (
                  cards?.slice(0, 6).map((card, i) => (
                    <motion.div
                      key={card.category}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                      className={`flex items-start gap-3 p-3.5 rounded-2xl border border-white/10 bg-gradient-to-r ${card.color} backdrop-blur-sm`}
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/10">
                        <card.icon className="w-4.5 h-4.5 text-white/80" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium">{card.category}</p>
                        <p className="text-sm font-semibold text-white mb-0.5">{card.title}</p>
                        <p className="text-xs text-white/60 leading-relaxed">{card.summary}</p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="px-6 py-5 border-t border-white/10 flex gap-3">
              <Button onClick={onClose} className="flex-1 rounded-2xl font-display font-bold text-white shadow-lg" style={{ background: "linear-gradient(135deg, #2E8B57, #0F5132)" }}>
                Start My Day
              </Button>
              <Button onClick={handleExploreMore} variant="ghost" className="flex-1 rounded-2xl font-display font-medium text-white/70 hover:text-white border border-white/15 hover:bg-white/10">
                Explore More <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DailyRisePopup;
