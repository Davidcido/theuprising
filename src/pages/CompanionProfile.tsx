import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageCircle, ArrowLeft, Sparkles, Heart, MessageSquare } from "lucide-react";
import { BUILTIN_PERSONAS } from "@/lib/builtinPersonas";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type CompanionPost = {
  id: string;
  content: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
};

type CompanionComment = {
  id: string;
  content: string;
  created_at: string;
  post_id: string;
};

const CompanionProfile = () => {
  const { companionId } = useParams<{ companionId: string }>();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<CompanionPost[]>([]);
  const [comments, setComments] = useState<CompanionComment[]>([]);
  const [activeTab, setActiveTab] = useState<"about" | "posts" | "comments">("about");

  const persona = useMemo(
    () => BUILTIN_PERSONAS.find(p => p.id === companionId),
    [companionId]
  );

  useEffect(() => {
    if (!persona) return;
    // Fetch posts by this companion
    supabase
      .from("community_posts")
      .select("id, content, created_at, likes_count, comments_count")
      .eq("anonymous_name", persona.name)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => { if (data) setPosts(data); });

    // Fetch comments by this companion
    supabase
      .from("community_comments")
      .select("id, content, created_at, post_id")
      .eq("anonymous_name", persona.name)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => { if (data) setComments(data); });
  }, [persona]);

  if (!persona) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Companion not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  const formatDate = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch { return ts; }
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Cover / Hero */}
      <div
        className="relative h-48 md:h-56"
        style={{
          background: `linear-gradient(135deg, ${persona.color}40 0%, ${persona.color}15 50%, transparent 100%)`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-10 p-2 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Avatar + Info */}
      <div className="px-5 -mt-16 relative z-10">
        <div className="flex items-end gap-4">
          <div
            className="w-28 h-28 rounded-full border-4 overflow-hidden shadow-xl"
            style={{ borderColor: persona.color + "60" }}
          >
            <img src={persona.avatar_image} alt={persona.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 pb-2">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{persona.name}</h1>
              <span className="text-lg">{persona.avatar_emoji}</span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: persona.color + "25", color: persona.color }}
              >
                AI Companion
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{persona.role}</p>
          </div>
        </div>

        {/* Message button */}
        <div className="mt-4 flex gap-3">
          <Button
            onClick={() => navigate(`/chat?companion=${persona.id}`)}
            className="flex-1 gap-2"
            style={{ background: persona.color, color: "white" }}
          >
            <MessageCircle className="w-4 h-4" /> Message {persona.name}
          </Button>
        </div>

        {/* Description */}
        <div className="mt-5 p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-sm text-foreground/90 leading-relaxed">{persona.description}</p>
          <p className="text-xs text-muted-foreground mt-3 italic">"{persona.meaning}"</p>
        </div>

        {/* Personality traits */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Tone</p>
            <p className="text-xs text-foreground capitalize">{persona.emotional_tone}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Style</p>
            <p className="text-xs text-foreground line-clamp-2">{persona.conversation_style.split(",")[0]}</p>
          </div>
        </div>

        {/* Interests */}
        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Interests</p>
          <div className="flex flex-wrap gap-1.5">
            {persona.interests.split(",").map((interest, i) => (
              <span
                key={i}
                className="text-[10px] px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-muted-foreground"
              >
                {interest.trim()}
              </span>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex border-b border-white/10">
          {(["about", "posts", "comments"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors capitalize ${
                activeTab === tab
                  ? "text-foreground border-b-2"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              style={activeTab === tab ? { borderColor: persona.color } : undefined}
            >
              {tab === "posts" ? `Posts (${posts.length})` : tab === "comments" ? `Comments (${comments.length})` : "About"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mt-4 space-y-3 pb-8">
          {activeTab === "about" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">Personality</p>
                <p className="text-sm text-foreground/90 leading-relaxed">{persona.personality}</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">Conversation Style</p>
                <p className="text-sm text-foreground/90 leading-relaxed">{persona.conversation_style}</p>
              </div>
            </motion.div>
          )}

          {activeTab === "posts" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              {posts.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No posts yet</p>
              ) : posts.map(p => (
                <div
                  key={p.id}
                  onClick={() => navigate("/community")}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 cursor-pointer transition-colors"
                >
                  <p className="text-sm text-foreground/90 line-clamp-3">{p.content}</p>
                  <div className="flex items-center gap-4 mt-2.5 text-[10px] text-muted-foreground">
                    <span>{formatDate(p.created_at)}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {p.likes_count}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {p.comments_count}</span>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === "comments" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              {comments.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No comments yet</p>
              ) : comments.map(c => (
                <div
                  key={c.id}
                  onClick={() => navigate("/community")}
                  className="p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 cursor-pointer transition-colors"
                >
                  <p className="text-xs text-foreground/85 line-clamp-2">{c.content}</p>
                  <span className="text-[10px] text-muted-foreground mt-1.5 block">{formatDate(c.created_at)}</span>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanionProfile;
