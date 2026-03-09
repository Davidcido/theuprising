import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Hash, TrendingUp, Users, Sparkles, Search, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import UserAvatar from "@/components/UserAvatar";
import HashtagText from "@/components/community/HashtagText";
import MediaGallery from "@/components/community/MediaGallery";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { useAuthReady } from "@/hooks/useAuthReady";

type ExplorePost = {
  id: string;
  content: string;
  anonymous_name: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  created_at: string;
  author_id: string | null;
  is_anonymous: boolean;
  media_urls: string[];
  author_profile?: { display_name: string | null; avatar_url: string } | null;
};

type Creator = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  post_count: number;
  follower_count: number;
};

const formatCount = (n: number) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
};

const Explore = () => {
  const { user: authUser, isReady } = useAuthReady();
  const [searchParams] = useSearchParams();
  const tagFilter = searchParams.get("tag");
  const navigate = useNavigate();

  const [posts, setPosts] = useState<ExplorePost[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState<"trending" | "hashtags" | "creators">(
    tagFilter ? "hashtags" : "trending"
  );

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch recent posts with engagement
      const { data: postsData } = await supabase
        .from("community_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (postsData) {
        const authorIds = [...new Set(postsData.filter(p => p.author_id).map(p => p.author_id!))];
        let profilesMap: Record<string, { display_name: string | null; avatar_url: string }> = {};
        if (authorIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url")
            .in("user_id", authorIds);
          if (profiles) profiles.forEach(p => { profilesMap[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url ?? "" }; });
        }
        setPosts(postsData.map(p => ({
          ...p,
          media_urls: p.media_urls || [],
          author_profile: p.author_id ? profilesMap[p.author_id] || null : null,
        })));
      }

      // Fetch popular creators
      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, bio")
        .limit(50);

      if (allProfiles) {
        const userIds = allProfiles.map(p => p.user_id);
        const [{ data: postCounts }, { data: followerCounts }] = await Promise.all([
          supabase.from("community_posts").select("author_id").in("author_id", userIds),
          supabase.from("follows").select("following_id").in("following_id", userIds),
        ]);

        const pCounts: Record<string, number> = {};
        postCounts?.forEach(p => { if (p.author_id) pCounts[p.author_id] = (pCounts[p.author_id] || 0) + 1; });
        const fCounts: Record<string, number> = {};
        followerCounts?.forEach(f => { fCounts[f.following_id] = (fCounts[f.following_id] || 0) + 1; });

        const scored = allProfiles
          .map(p => ({
            ...p,
            post_count: pCounts[p.user_id] || 0,
            follower_count: fCounts[p.user_id] || 0,
          }))
          .filter(p => p.post_count > 0 || p.follower_count > 0)
          .sort((a, b) => (b.follower_count * 3 + b.post_count) - (a.follower_count * 3 + a.post_count));

        setCreators(scored.slice(0, 10));
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  // Extract trending hashtags from posts
  const trendingHashtags = useMemo(() => {
    const tagMap: Record<string, { count: number; engagement: number; recentCount: number }> = {};
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;

    for (const post of posts) {
      const matches = post.content.match(/#(\w+)/g);
      if (!matches) continue;
      const tags = [...new Set(matches.map(m => m.slice(1).toLowerCase()))];
      const engagement = post.likes_count * 3 + post.comments_count * 4 + post.shares_count * 5;
      const isRecent = new Date(post.created_at).getTime() > dayAgo;

      for (const tag of tags) {
        if (!tagMap[tag]) tagMap[tag] = { count: 0, engagement: 0, recentCount: 0 };
        tagMap[tag].count++;
        tagMap[tag].engagement += engagement;
        if (isRecent) tagMap[tag].recentCount++;
      }
    }

    return Object.entries(tagMap)
      .map(([tag, data]) => ({
        tag,
        count: data.count,
        score: data.count * 2 + data.engagement + data.recentCount * 10,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }, [posts]);

  // Filter posts by hashtag
  const filteredPosts = useMemo(() => {
    if (tagFilter) {
      return posts.filter(p => p.content.toLowerCase().includes(`#${tagFilter.toLowerCase()}`));
    }
    if (searchQuery.startsWith("#") && searchQuery.length > 1) {
      const q = searchQuery.slice(1).toLowerCase();
      return posts.filter(p => p.content.toLowerCase().includes(`#${q}`));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return posts.filter(p => p.content.toLowerCase().includes(q));
    }
    // Trending: sort by engagement velocity
    const now = Date.now();
    return [...posts].sort((a, b) => {
      const hoursA = Math.max(1, (now - new Date(a.created_at).getTime()) / 3600000);
      const hoursB = Math.max(1, (now - new Date(b.created_at).getTime()) / 3600000);
      const velocityA = (a.likes_count * 3 + a.comments_count * 4 + a.shares_count * 5) / hoursA;
      const velocityB = (b.likes_count * 3 + b.comments_count * 4 + b.shares_count * 5) / hoursB;
      return velocityB - velocityA;
    }).slice(0, 30);
  }, [posts, tagFilter, searchQuery]);

  const filteredHashtags = useMemo(() => {
    if (!searchQuery || !searchQuery.startsWith("#")) return trendingHashtags;
    const q = searchQuery.slice(1).toLowerCase();
    return trendingHashtags.filter(h => h.tag.includes(q));
  }, [trendingHashtags, searchQuery]);

  if (loading || !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          <p className="text-muted-foreground text-sm">Loading your space…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 pb-24">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          {tagFilter && (
            <button onClick={() => navigate("/explore")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Explore
            </button>
          )}
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            {tagFilter ? (
              <span className="flex items-center gap-2">
                <Hash className="w-7 h-7 text-emerald-400" />
                {tagFilter}
              </span>
            ) : (
              "Explore"
            )}
          </h1>
          {!tagFilter && <p className="text-muted-foreground text-sm">Discover trending content, hashtags, and creators</p>}
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search posts or #hashtags..."
            className="pl-10 bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground/50 rounded-xl"
          />
        </div>

        {/* Section tabs (hide when filtering by tag) */}
        {!tagFilter && (
          <div className="flex gap-1 mb-5 p-1 rounded-2xl backdrop-blur-xl border border-white/10" style={{ background: "rgba(255,255,255,0.04)" }}>
            {([
              { key: "trending", label: "Trending", icon: TrendingUp },
              { key: "hashtags", label: "Hashtags", icon: Hash },
              { key: "creators", label: "Creators", icon: Users },
            ] as const).map((tab) => {
              const isActive = activeSection === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveSection(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Trending Hashtags section */}
        {(activeSection === "hashtags" || tagFilter) && !tagFilter && (
          <div className="mb-6">
            {filteredHashtags.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Hash className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No hashtags found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredHashtags.map((h, i) => (
                  <motion.button
                    key={h.tag}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => navigate(`/explore?tag=${h.tag}`)}
                    className="w-full flex items-center justify-between p-3 rounded-xl backdrop-blur-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-left"
                    style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)" }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                        <Hash className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">#{h.tag}</p>
                        <p className="text-[11px] text-muted-foreground">{h.count} {h.count === 1 ? "post" : "posts"}</p>
                      </div>
                    </div>
                    {i < 3 && (
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        🔥 Trending
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Popular Creators section */}
        {activeSection === "creators" && !tagFilter && (
          <div className="mb-6">
            {creators.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>No creators found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {creators.map((creator, i) => (
                  <motion.button
                    key={creator.user_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => navigate(`/profile/${creator.user_id}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl backdrop-blur-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all text-left"
                    style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)" }}
                  >
                    <UserAvatar
                      avatarUrl={creator.avatar_url}
                      displayName={creator.display_name || "User"}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{creator.display_name || "User"}</p>
                      {creator.bio && <p className="text-[11px] text-muted-foreground truncate">{creator.bio}</p>}
                      <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span>{formatCount(creator.follower_count)} followers</span>
                        <span>{creator.post_count} posts</span>
                      </div>
                    </div>
                    {i < 3 && (
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full shrink-0">
                        <Sparkles className="w-3 h-3 inline mr-0.5" />Top
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Trending Posts / Hashtag-filtered posts */}
        {(activeSection === "trending" || tagFilter) && (
          <div>
            {tagFilter && (
              <p className="text-sm text-muted-foreground mb-3">{filteredPosts.length} {filteredPosts.length === 1 ? "post" : "posts"} with #{tagFilter}</p>
            )}
            {filteredPosts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>{tagFilter ? `No posts with #${tagFilter}` : "No trending posts yet"}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPosts.map((post) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl backdrop-blur-xl border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
                    style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)" }}
                    onClick={() => navigate("/community")}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <UserAvatar
                        avatarUrl={post.author_profile?.avatar_url}
                        displayName={!post.is_anonymous && post.author_profile?.display_name ? post.author_profile.display_name : post.anonymous_name}
                        size="xs"
                        onClick={!post.is_anonymous && post.author_id ? () => { navigate(`/profile/${post.author_id}`); } : undefined}
                      />
                      <span className="text-xs font-medium text-foreground">
                        {!post.is_anonymous && post.author_profile?.display_name ? post.author_profile.display_name : post.anonymous_name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="text-foreground/90 text-sm whitespace-pre-wrap break-words mb-2 line-clamp-4">
                      <HashtagText content={post.content} />
                    </div>
                    {post.media_urls.length > 0 && <MediaGallery mediaUrls={post.media_urls} />}
                    <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground/50">
                      <span>❤️ {formatCount(post.likes_count)}</span>
                      <span>💬 {formatCount(post.comments_count)}</span>
                      <span>🔁 {formatCount(post.shares_count)}</span>
                      <span>👁 {formatCount(post.views_count)}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Explore;
