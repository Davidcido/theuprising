import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Send, Shield } from "lucide-react";

type Post = {
  id: number;
  content: string;
  likes: number;
  liked: boolean;
  timestamp: string;
  replies: string[];
};

const initialPosts: Post[] = [
  {
    id: 1,
    content: "I've been struggling with loneliness for months, but finding this community makes me feel like I'm not the only one. We got this. 💚",
    likes: 24,
    liked: false,
    timestamp: "2 hours ago",
    replies: ["You're never alone here! 🤗", "Same here. Sending you love."],
  },
  {
    id: 2,
    content: "Today I went outside for a walk even though my anxiety told me not to. Small wins matter.",
    likes: 47,
    liked: false,
    timestamp: "5 hours ago",
    replies: ["That's HUGE. Proud of you!", "Small steps, big courage."],
  },
  {
    id: 3,
    content: "Reminder: healing isn't linear. Some days you'll feel amazing, other days you won't. Both are okay.",
    likes: 62,
    liked: false,
    timestamp: "1 day ago",
    replies: ["Needed this today. Thank you. 🙏"],
  },
];

const Community = () => {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [newPost, setNewPost] = useState("");

  const toggleLike = (id: number) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p
      )
    );
  };

  const addPost = () => {
    if (!newPost.trim()) return;
    const post: Post = {
      id: Date.now(),
      content: newPost.trim(),
      likes: 0,
      liked: false,
      timestamp: "Just now",
      replies: [],
    };
    setPosts([post, ...posts]);
    setNewPost("");
  };

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-10">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4"
          >
            The Uprising Community
          </motion.h1>
          <p className="text-muted-foreground">
            A safe space to share, support, and uplift each other.
          </p>
          <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-uprising-green-light text-uprising-green-dark text-sm font-medium">
            <Shield className="w-4 h-4" />
            Positive energy only — no judgment, no hate
          </div>
        </div>

        {/* New Post */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-soft mb-8">
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="Share how you're feeling, a story, or words of encouragement..."
            rows={3}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <div className="flex justify-between items-center mt-3">
            <span className="text-xs text-muted-foreground">Anonymous posting — your identity is protected 🔒</span>
            <button
              onClick={addPost}
              disabled={!newPost.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-hero text-primary-foreground text-sm font-semibold disabled:opacity-40"
            >
              Share <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Posts */}
        <div className="space-y-4">
          {posts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-6 rounded-2xl bg-card border border-border"
            >
              <p className="text-foreground text-sm leading-relaxed mb-4">{post.content}</p>

              <div className="flex items-center gap-4 mb-3">
                <button
                  onClick={() => toggleLike(post.id)}
                  className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors ${
                    post.liked ? "text-uprising-orange" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Heart className="w-4 h-4" fill={post.liked ? "currentColor" : "none"} />
                  {post.likes}
                </button>
                <span className="text-xs text-muted-foreground">{post.timestamp}</span>
              </div>

              {post.replies.length > 0 && (
                <div className="space-y-2 pl-4 border-l-2 border-uprising-green-light">
                  {post.replies.map((reply, j) => (
                    <p key={j} className="text-sm text-muted-foreground">{reply}</p>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Community;
