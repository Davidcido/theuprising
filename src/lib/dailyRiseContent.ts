import {
  Sun, Globe, MapPin, Landmark, Trophy, Film, Cpu, Briefcase, HeartPulse, Dumbbell, Telescope,
} from "lucide-react";

export interface DailyRiseCard {
  icon: typeof Sun;
  title: string;
  category: string;
  summary: string;
  color: string; // tailwind bg class using design tokens
}

// Returns daily content — in production this would come from an API/edge function
export const getDailyRiseCards = (): DailyRiseCard[] => [
  {
    icon: Sun,
    category: "Daily Motivation",
    title: "Rise & Shine",
    summary: "Every morning is a fresh start. You don't have to be perfect — just be present. Today is yours to shape.",
    color: "from-amber-500/20 to-orange-500/20",
  },
  {
    icon: Globe,
    category: "Global News",
    title: "World Update",
    summary: "Global leaders are gathering to discuss climate action and youth empowerment at this week's summit.",
    color: "from-blue-500/20 to-cyan-500/20",
  },
  {
    icon: MapPin,
    category: "Local News",
    title: "In Your Area",
    summary: "Community clean-up drives and youth mentorship programs are expanding across major cities this month.",
    color: "from-emerald-500/20 to-green-500/20",
  },
  {
    icon: Landmark,
    category: "Politics",
    title: "Policy Watch",
    summary: "New youth-focused policies are being proposed to improve education access and digital skills training.",
    color: "from-purple-500/20 to-indigo-500/20",
  },
  {
    icon: Trophy,
    category: "Sports",
    title: "Game On",
    summary: "African athletes continue to break records on the world stage, inspiring a new generation of champions.",
    color: "from-yellow-500/20 to-amber-500/20",
  },
  {
    icon: Film,
    category: "Entertainment",
    title: "Trending Now",
    summary: "New music drops and film releases are celebrating African culture and storytelling this week.",
    color: "from-pink-500/20 to-rose-500/20",
  },
  {
    icon: Cpu,
    category: "Tech & Innovation",
    title: "Tech Spotlight",
    summary: "Young African innovators are building apps and platforms that solve real community problems.",
    color: "from-cyan-500/20 to-blue-500/20",
  },
  {
    icon: Briefcase,
    category: "Corpers Corner",
    title: "NYSC Update",
    summary: "Tips for making the most of your service year — networking, skill-building, and community impact.",
    color: "from-teal-500/20 to-emerald-500/20",
  },
  {
    icon: HeartPulse,
    category: "Health & Wellness",
    title: "Mind & Body",
    summary: "Staying hydrated, getting enough sleep, and taking short breaks can boost your mood and productivity.",
    color: "from-red-500/20 to-pink-500/20",
  },
  {
    icon: Dumbbell,
    category: "Fitness Tip",
    title: "Move Today",
    summary: "A 15-minute walk or stretch session can reduce stress and improve focus. Start small, stay consistent.",
    color: "from-orange-500/20 to-amber-500/20",
  },
  {
    icon: Telescope,
    category: "World Discoveries",
    title: "Did You Know?",
    summary: "Scientists have discovered new species in deep ocean trenches, reminding us how much we have yet to explore.",
    color: "from-violet-500/20 to-purple-500/20",
  },
];
