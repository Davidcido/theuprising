import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getDailyRiseCards, DailyRiseCard } from "@/lib/dailyRiseContent";
import {
  Sun, Globe, MapPin, Landmark, Trophy, Film, Cpu, Briefcase, HeartPulse, Dumbbell, Telescope,
} from "lucide-react";

const iconMap: Record<string, typeof Sun> = {
  "Daily Motivation": Sun,
  "Global News": Globe,
  "Local News": MapPin,
  "Politics": Landmark,
  "Sports": Trophy,
  "Entertainment": Film,
  "Tech & Innovation": Cpu,
  "Corpers Corner": Briefcase,
  "Health & Wellness": HeartPulse,
  "Fitness Tip": Dumbbell,
  "World Discoveries": Telescope,
};

const colorMap: Record<string, string> = {
  "Daily Motivation": "from-amber-500/20 to-orange-500/20",
  "Global News": "from-blue-500/20 to-cyan-500/20",
  "Local News": "from-emerald-500/20 to-green-500/20",
  "Politics": "from-purple-500/20 to-indigo-500/20",
  "Sports": "from-yellow-500/20 to-amber-500/20",
  "Entertainment": "from-pink-500/20 to-rose-500/20",
  "Tech & Innovation": "from-cyan-500/20 to-blue-500/20",
  "Corpers Corner": "from-teal-500/20 to-emerald-500/20",
  "Health & Wellness": "from-red-500/20 to-pink-500/20",
  "Fitness Tip": "from-orange-500/20 to-amber-500/20",
  "World Discoveries": "from-violet-500/20 to-purple-500/20",
};

export const useDailyRiseContent = () => {
  return useQuery({
    queryKey: ["daily-rise-content"],
    queryFn: async (): Promise<DailyRiseCard[]> => {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("daily_rise_content" as any)
        .select("cards")
        .eq("content_date", today)
        .maybeSingle();

      if (error || !data) {
        // Try to generate if missing
        try {
          await supabase.functions.invoke("generate-daily-rise");
          const { data: retry } = await supabase
            .from("daily_rise_content" as any)
            .select("cards")
            .eq("content_date", today)
            .maybeSingle();

          if (retry?.cards) {
            return mapCards(retry.cards as any[]);
          }
        } catch {
          // Fall through to static fallback
        }
        return getDailyRiseCards();
      }

      return mapCards(data.cards as any[]);
    },
    staleTime: 1000 * 60 * 30, // 30 min
  });
};

function mapCards(raw: any[]): DailyRiseCard[] {
  return raw.map((card) => ({
    icon: iconMap[card.category] || Sun,
    category: card.category,
    title: card.title,
    summary: card.summary,
    color: colorMap[card.category] || "from-gray-500/20 to-slate-500/20",
  }));
}
