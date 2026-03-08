import { motion } from "framer-motion";
import { Sun } from "lucide-react";
import { getDailyRiseCards } from "@/lib/dailyRiseContent";

const DailyRise = () => {
  const cards = getDailyRiseCards();
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 shadow-lg"
            style={{ background: "linear-gradient(135deg, #2E8B57, #0F5132)" }}
          >
            <Sun className="w-8 h-8 text-yellow-300" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-display font-bold text-white mb-3"
          >
            Daily Rise
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white/50 mb-1"
          >
            Your daily update from the Uprising community.
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-white/30"
          >
            {today}
          </motion.p>
        </div>
      </section>

      {/* Cards Grid */}
      <section className="pb-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cards.map((card, i) => (
              <motion.div
                key={card.category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.06 }}
                className={`flex items-start gap-4 p-5 rounded-3xl border border-white/10 bg-gradient-to-br ${card.color} backdrop-blur-xl hover:border-white/25 transition-all`}
              >
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
                  style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))" }}
                >
                  <card.icon className="w-5 h-5 text-white/80" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium mb-0.5">{card.category}</p>
                  <p className="text-base font-display font-semibold text-white mb-1">{card.title}</p>
                  <p className="text-sm text-white/60 leading-relaxed">{card.summary}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default DailyRise;
