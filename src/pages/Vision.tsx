import { motion } from "framer-motion";
import { Heart, Users, Palette, Mic, Shield } from "lucide-react";

const beliefs = [
  { icon: Users, text: "We rise together", desc: "No one should face hard times alone." },
  { icon: Heart, text: "Everyone belongs", desc: "Every identity, every story, every person matters." },
  { icon: Palette, text: "Expression is power", desc: "Creativity heals. Art connects. Your voice matters." },
  { icon: Shield, text: "Healing matters", desc: "Taking care of your mental health is brave, not weak." },
  { icon: Mic, text: "Community first", desc: "Together we're louder, stronger, and more alive." },
];

const Vision = () => {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative py-24 md:py-36 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-90" />
        <div className="absolute top-10 right-20 w-64 h-64 rounded-full bg-primary-foreground/10 blur-3xl" />
        <div className="absolute bottom-10 left-10 w-80 h-80 rounded-full bg-primary-foreground/5 blur-3xl" />

        <div className="container relative mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="text-5xl md:text-7xl font-display font-bold text-primary-foreground mb-6">
              THE UPRISING
            </h1>
            <p className="text-xl md:text-2xl text-primary-foreground/80 max-w-2xl mx-auto font-body">
              A global youth community where people rise together through positive energy, creativity, expression, and emotional support.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Beliefs */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              What We Believe
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              These aren't just words. They're promises we make to each other.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {beliefs.map((b, i) => (
              <motion.div
                key={b.text}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="p-8 rounded-2xl bg-card border border-border hover:shadow-medium transition-all text-center"
              >
                <div className="w-14 h-14 mx-auto rounded-2xl bg-uprising-green-light flex items-center justify-center mb-4">
                  <b.icon className="w-7 h-7 text-uprising-green-dark" />
                </div>
                <h3 className="text-xl font-display font-bold text-foreground mb-2">{b.text}</h3>
                <p className="text-sm text-muted-foreground">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center p-12 rounded-3xl bg-gradient-calm border border-border"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              This Is Your Movement
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              The Uprising is built by young people, for young people. Your voice matters. Your feelings matter. You matter.
            </p>
            <div className="text-4xl">💚🌍✊</div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Vision;
