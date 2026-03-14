import { useState } from "react";
import { motion } from "framer-motion";
import { Brain, X, Trash2, Search, Sparkles, Heart, Target, User, Star, Clock, GraduationCap, Briefcase, Trophy, Mountain, Lightbulb, Calendar } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { AIMemory, LifeEvent } from "@/hooks/useAIMemory";

interface MemoryPanelProps {
  memories: AIMemory[];
  lifeEvents: LifeEvent[];
  memoryEnabled: boolean | null;
  onDeleteMemory: (id: string) => Promise<void>;
  onClearAll: () => Promise<void>;
  companionName: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  identity: <User className="w-3 h-3" />,
  goals: <Target className="w-3 h-3" />,
  relationships: <Heart className="w-3 h-3" />,
  emotional: <Sparkles className="w-3 h-3" />,
  preferences: <Star className="w-3 h-3" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  identity: "bg-blue-500/20 text-blue-300",
  goals: "bg-amber-500/20 text-amber-300",
  relationships: "bg-pink-500/20 text-pink-300",
  emotional: "bg-purple-500/20 text-purple-300",
  preferences: "bg-emerald-500/20 text-emerald-300",
  personal: "bg-cyan-500/20 text-cyan-300",
  life_events: "bg-orange-500/20 text-orange-300",
  general: "bg-white/10 text-white/60",
};

const EVENT_CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; color: string; emoji: string }> = {
  career: { icon: <Briefcase className="w-3.5 h-3.5" />, color: "text-blue-400 bg-blue-500/20", emoji: "💼" },
  education: { icon: <GraduationCap className="w-3.5 h-3.5" />, color: "text-indigo-400 bg-indigo-500/20", emoji: "🎓" },
  relationships: { icon: <Heart className="w-3.5 h-3.5" />, color: "text-pink-400 bg-pink-500/20", emoji: "❤️" },
  achievements: { icon: <Trophy className="w-3.5 h-3.5" />, color: "text-amber-400 bg-amber-500/20", emoji: "🏆" },
  personal_growth: { icon: <Lightbulb className="w-3.5 h-3.5" />, color: "text-emerald-400 bg-emerald-500/20", emoji: "🌱" },
  challenges: { icon: <Mountain className="w-3.5 h-3.5" />, color: "text-orange-400 bg-orange-500/20", emoji: "⛰️" },
  hobbies: { icon: <Star className="w-3.5 h-3.5" />, color: "text-purple-400 bg-purple-500/20", emoji: "✨" },
  major_life_changes: { icon: <Sparkles className="w-3.5 h-3.5" />, color: "text-rose-400 bg-rose-500/20", emoji: "🔄" },
  general: { icon: <Calendar className="w-3.5 h-3.5" />, color: "text-white/60 bg-white/10", emoji: "💭" },
};

function getEventConfig(category: string) {
  return EVENT_CATEGORY_CONFIG[category] || EVENT_CATEGORY_CONFIG.general;
}

function formatEventDate(dateStr?: string | null, createdAt?: string): string {
  if (dateStr) return dateStr;
  if (createdAt) {
    const d = new Date(createdAt);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  return "";
}

const MemoryPanel = ({ memories, lifeEvents, memoryEnabled, onDeleteMemory, onClearAll, companionName }: MemoryPanelProps) => {
  const [search, setSearch] = useState("");
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearing, setClearing] = useState(false);

  const filteredMemories = search
    ? memories.filter(m => m.memory_text.toLowerCase().includes(search.toLowerCase()))
    : memories;

  const filteredEvents = search
    ? lifeEvents.filter(e => e.event_text.toLowerCase().includes(search.toLowerCase()))
    : lifeEvents;

  // Sort life events chronologically (newest first)
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const dateA = a.event_date || a.created_at;
    const dateB = b.event_date || b.created_at;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  const handleClear = async () => {
    setClearing(true);
    await onClearAll();
    setClearing(false);
    setShowClearDialog(false);
    toast.success("All memories cleared");
  };

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <button
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-white/10 hover:opacity-90 transition-colors relative"
            style={{ backgroundColor: "#0F2E1F" }}
          >
            <Brain className="w-3.5 h-3.5 text-primary" />
            {memoryEnabled && memories.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[9px] font-bold flex items-center justify-center text-primary-foreground">
                {memories.length > 99 ? "99+" : memories.length}
              </span>
            )}
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:w-96 bg-background/95 backdrop-blur-xl border-l border-white/10 p-0 [&>button]:z-20 [&>button]:text-foreground">
          <SheetHeader className="px-4 pt-4 pb-3 border-b border-white/10 pr-12">
            <SheetTitle className="flex items-center gap-2 text-foreground">
              <Brain className="w-4 h-4 text-primary" />
              {companionName}'s Memory
            </SheetTitle>
          </SheetHeader>

          <div className="flex flex-col h-[calc(100%-4rem)]">
            {!memoryEnabled ? (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center">
                  <Brain className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Memory is disabled</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Enable it in chat to let {companionName} remember you</p>
                </div>
              </div>
            ) : (
              <>
                {/* Search + actions */}
                <div className="px-4 py-3 flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search memories..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 h-8 text-xs bg-white/5 border-white/10"
                    />
                  </div>
                  {memories.length > 0 && (
                    <button
                      onClick={() => setShowClearDialog(true)}
                      className="shrink-0 p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Tabs: Memories / Life Timeline */}
                <Tabs defaultValue="memories" className="flex-1 flex flex-col min-h-0">
                  <TabsList className="mx-4 mb-2 bg-white/5">
                    <TabsTrigger value="memories" className="text-xs gap-1.5 data-[state=active]:bg-white/10">
                      <Brain className="w-3 h-3" />
                      Memories ({memories.length})
                    </TabsTrigger>
                    <TabsTrigger value="timeline" className="text-xs gap-1.5 data-[state=active]:bg-white/10">
                      <Clock className="w-3 h-3" />
                      Life Timeline ({lifeEvents.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* Memories tab */}
                  <TabsContent value="memories" className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 mt-0">
                    {filteredMemories.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground">
                          {search ? "No memories match your search" : "No memories yet"}
                        </p>
                        {!search && (
                          <p className="text-xs text-muted-foreground/60 mt-1">
                            {companionName} will start remembering as you chat
                          </p>
                        )}
                      </div>
                    )}

                    {filteredMemories.map((m) => (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="group flex items-start gap-2 p-2.5 rounded-xl bg-white/5 border border-white/8 hover:border-white/15 transition-colors"
                      >
                        <div className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium flex items-center gap-1 ${CATEGORY_COLORS[m.category] || CATEGORY_COLORS.general}`}>
                          {CATEGORY_ICONS[m.category] || <Sparkles className="w-3 h-3" />}
                          {m.category}
                        </div>
                        <p className="flex-1 text-xs text-foreground/80 leading-relaxed">{m.memory_text}</p>
                        <button
                          onClick={() => onDeleteMemory(m.id)}
                          className="shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.div>
                    ))}
                  </TabsContent>

                  {/* Life Timeline tab */}
                  <TabsContent value="timeline" className="flex-1 overflow-y-auto px-4 pb-4 mt-0">
                    {sortedEvents.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground">
                          {search ? "No events match your search" : "No life events yet"}
                        </p>
                        {!search && (
                          <p className="text-xs text-muted-foreground/60 mt-1">
                            Share your experiences and {companionName} will build your timeline
                          </p>
                        )}
                      </div>
                    )}

                    {sortedEvents.length > 0 && (
                      <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-[15px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />

                        <div className="space-y-1">
                          {sortedEvents.map((evt, idx) => {
                            const config = getEventConfig(evt.event_category);
                            return (
                              <motion.div
                                key={evt.id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="relative flex items-start gap-3 pl-1 py-2"
                              >
                                {/* Timeline dot */}
                                <div className={`relative z-10 shrink-0 w-[30px] h-[30px] rounded-full flex items-center justify-center ${config.color} ring-2 ring-background`}>
                                  {config.icon}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 pt-0.5">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                      {evt.event_category.replace(/_/g, " ")}
                                    </span>
                                    {(evt.importance_score ?? 5) >= 7 && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                                        Important
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-foreground/80 leading-relaxed">
                                    {config.emoji} {evt.event_text}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                                    {formatEventDate(evt.event_date, evt.created_at)}
                                  </p>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all memories?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all of {companionName}'s memories about you. New memories will still be created as you chat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClear}
              disabled={clearing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {clearing ? "Clearing…" : "Clear All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MemoryPanel;
