
-- Performance indexes for frequently queried columns

-- Community posts: most queries filter/sort by created_at and author_id
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON public.community_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_author_id ON public.community_posts (author_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_engagement ON public.community_posts (engagement_score DESC NULLS LAST);

-- Comments: always queried by post_id
CREATE INDEX IF NOT EXISTS idx_community_comments_post_id ON public.community_comments (post_id, created_at ASC);

-- Likes: queried by post_id + session_id
CREATE INDEX IF NOT EXISTS idx_community_likes_post_session ON public.community_likes (post_id, session_id);

-- Reactions: queried by post_id
CREATE INDEX IF NOT EXISTS idx_community_reactions_post_id ON public.community_reactions (post_id);

-- Follows: queried by follower_id and following_id
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows (following_id);

-- Conversations: queried by user_one_id and user_two_id
CREATE INDEX IF NOT EXISTS idx_conversations_user_one ON public.conversations (user_one_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_two ON public.conversations (user_two_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON public.conversations (updated_at DESC);

-- Direct messages: queried by conversation_id, sorted by created_at
CREATE INDEX IF NOT EXISTS idx_direct_messages_conv_created ON public.direct_messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_unread ON public.direct_messages (conversation_id, read) WHERE read = false;

-- Notifications: queried by user_id, sorted by created_at
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications (user_id) WHERE read = false;

-- Profiles: queried by user_id (already PK indexed), add last_seen for activity queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON public.profiles (last_seen_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON public.profiles (display_name);

-- Bookmarks: queried by user_id
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON public.bookmarks (user_id, created_at DESC);

-- Profile views: queried by profile_user_id
CREATE INDEX IF NOT EXISTS idx_profile_views_profile ON public.profile_views (profile_user_id, viewed_at DESC);
