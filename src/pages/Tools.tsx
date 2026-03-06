import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wind, BookOpen, Heart, Sparkles, Target, X } from "lucide-react";

const tools = [
  {
    id: "breathing",
    icon: Wind,
    title: "5-Minute Breathing",
    description: "A calming breath exercise to center your mind.",
    color: "bg-uprising-green-light text-uprising-green-dark",
    content: (
      <BreathingExercise />
    ),
  },
  {
    id: "grounding",
    icon: Target,
    title: "Grounding Exercise",
    description: "5-4-3-2-1 technique to ease anxiety.",
    color: "bg-uprising-blue-light text-uprising-blue",
    content: <GroundingExercise />,
  },
  {
    id: "journaling",
    icon: BookOpen,
    title: "Journaling Prompts",
    description: "Guided prompts to help you process feelings.",
    color: "bg-uprising-orange-light text-uprising-orange",
    content: <JournalingPrompts />,
  },
  {
    id: "gratitude",
    icon: Heart,
    title: "Gratitude Reflection",
    description: "Focus on the good, even in hard times.",
    color: "bg-uprising-purple-light text-uprising-purple",
    content: <GratitudeReflection />,
  },
  {
    id: "affirmations",
    icon: Sparkles,
    title: "Positive Affirmations",
    description: "Words of encouragement to lift you up.",
    color: "bg-uprising-green-light text-uprising-green-dark",
    content: <AffirmationGenerator />,
  },
];

const Tools = () => {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const active = tools.find((t) => t.id === activeTool);

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4"
          >
            Healing Tools
          </motion.h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Simple exercises to help you feel calmer, lighter, and more grounded.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
          {tools.map((tool, i) => (
            <motion.button
              key={tool.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setActiveTool(tool.id)}
              className="text-left p-6 rounded-2xl bg-card border border-border hover:shadow-medium transition-all group"
            >
              <div className={`w-12 h-12 rounded-xl ${tool.color} flex items-center justify-center mb-4`}>
                <tool.icon className="w-6 h-6" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-1">{tool.title}</h3>
              <p className="text-sm text-muted-foreground">{tool.description}</p>
            </motion.button>
          ))}
        </div>

        <AnimatePresence>
          {active && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="max-w-2xl mx-auto p-8 rounded-3xl bg-card border border-border shadow-medium relative"
            >
              <button
                onClick={() => setActiveTool(null)}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-secondary text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-2xl font-display font-bold text-foreground mb-6">{active.title}</h2>
              {active.content}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

function BreathingExercise() {
  const [phase, setPhase] = useState<"idle" | "inhale" | "hold" | "exhale">("idle");
  const [count, setCount] = useState(0);

  const start = () => {
    let cycle = 0;
    const run = () => {
      if (cycle >= 5) { setPhase("idle"); return; }
      setPhase("inhale"); setCount(4);
      const inhale = setInterval(() => setCount((c) => { if (c <= 1) { clearInterval(inhale); return 0; } return c - 1; }), 1000);
      setTimeout(() => {
        setPhase("hold"); setCount(4);
        const hold = setInterval(() => setCount((c) => { if (c <= 1) { clearInterval(hold); return 0; } return c - 1; }), 1000);
        setTimeout(() => {
          setPhase("exhale"); setCount(4);
          const exhale = setInterval(() => setCount((c) => { if (c <= 1) { clearInterval(exhale); return 0; } return c - 1; }), 1000);
          setTimeout(() => { cycle++; run(); }, 4000);
        }, 4000);
      }, 4000);
    };
    run();
  };

  return (
    <div className="text-center space-y-6">
      <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center transition-all duration-1000 ${
        phase === "inhale" ? "scale-125 bg-uprising-green-light" :
        phase === "hold" ? "scale-125 bg-uprising-blue-light" :
        phase === "exhale" ? "scale-100 bg-uprising-purple-light" :
        "scale-100 bg-secondary"
      }`}>
        <span className="text-2xl font-display font-bold text-foreground">
          {phase === "idle" ? "🫁" : count}
        </span>
      </div>
      <p className="text-foreground font-medium capitalize">
        {phase === "idle" ? "Ready to breathe?" : phase}
      </p>
      {phase === "idle" && (
        <button onClick={start} className="px-6 py-3 rounded-xl bg-gradient-hero text-primary-foreground font-semibold text-sm">
          Start Exercise
        </button>
      )}
    </div>
  );
}

function GroundingExercise() {
  const steps = [
    { num: 5, sense: "things you can SEE", emoji: "👀" },
    { num: 4, sense: "things you can TOUCH", emoji: "✋" },
    { num: 3, sense: "things you can HEAR", emoji: "👂" },
    { num: 2, sense: "things you can SMELL", emoji: "👃" },
    { num: 1, sense: "thing you can TASTE", emoji: "👅" },
  ];

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm mb-4">
        This technique helps bring you back to the present moment.
      </p>
      {steps.map((s) => (
        <div key={s.num} className="flex items-center gap-4 p-4 rounded-xl bg-secondary">
          <span className="text-2xl">{s.emoji}</span>
          <div>
            <span className="font-display font-bold text-foreground">{s.num}</span>
            <span className="text-muted-foreground text-sm ml-2">{s.sense}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function JournalingPrompts() {
  const prompts = [
    "What emotion am I feeling most strongly right now?",
    "What would I say to a friend going through the same thing?",
    "What is one small thing that brought me comfort today?",
    "What do I need to let go of?",
    "If my feelings had a color, what would it be and why?",
  ];
  const [current, setCurrent] = useState(0);

  return (
    <div className="text-center space-y-6">
      <div className="p-6 rounded-xl bg-uprising-orange-light">
        <p className="text-lg font-medium text-foreground italic">"{prompts[current]}"</p>
      </div>
      <button
        onClick={() => setCurrent((c) => (c + 1) % prompts.length)}
        className="px-6 py-3 rounded-xl bg-uprising-orange text-primary-foreground font-semibold text-sm"
      >
        Next Prompt
      </button>
    </div>
  );
}

function GratitudeReflection() {
  const [items, setItems] = useState<string[]>([]);
  const [input, setInput] = useState("");

  const add = () => {
    if (input.trim()) { setItems([...items, input.trim()]); setInput(""); }
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">List 3 things you're grateful for today, no matter how small.</p>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="I'm grateful for..."
          className="flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button onClick={add} className="px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium">Add</button>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-uprising-purple-light">
            <Heart className="w-4 h-4 text-uprising-purple flex-shrink-0" fill="currentColor" />
            <span className="text-sm text-foreground">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AffirmationGenerator() {
  const affirmations = [
    "I am worthy of love and belonging.",
    "My feelings are valid, and it's okay to feel them.",
    "I am stronger than I know.",
    "This moment will pass, and I will be okay.",
    "I deserve peace, and I'm working towards it.",
    "I am enough, exactly as I am.",
    "Every day, I am growing and healing.",
    "I choose to be kind to myself today.",
  ];
  const [current, setCurrent] = useState(0);

  return (
    <div className="text-center space-y-6">
      <motion.div
        key={current}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-8 rounded-xl bg-uprising-green-light"
      >
        <Sparkles className="w-8 h-8 text-uprising-green-dark mx-auto mb-4" />
        <p className="text-xl font-display font-semibold text-foreground">
          "{affirmations[current]}"
        </p>
      </motion.div>
      <button
        onClick={() => setCurrent((c) => (c + 1) % affirmations.length)}
        className="px-6 py-3 rounded-xl bg-gradient-hero text-primary-foreground font-semibold text-sm"
      >
        New Affirmation ✨
      </button>
    </div>
  );
}

export default Tools;
