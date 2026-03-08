
-- Add author_id to community_comments for ownership tracking
ALTER TABLE public.community_comments ADD COLUMN IF NOT EXISTS author_id uuid;

-- Add RLS policy: comment owners can update their comments
CREATE POLICY "Comment owners can update their comments"
ON public.community_comments
FOR UPDATE
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

-- Add RLS policy: comment owners can delete their comments
CREATE POLICY "Comment owners can delete their comments"
ON public.community_comments
FOR DELETE
USING (auth.uid() = author_id);

-- Create user_blocks table
CREATE TABLE public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own blocks"
ON public.user_blocks FOR SELECT
USING (auth.uid() = blocker_id);

CREATE POLICY "Users can block others"
ON public.user_blocks FOR INSERT
WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock others"
ON public.user_blocks FOR DELETE
USING (auth.uid() = blocker_id);

-- Add attachment columns to direct_messages
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS attachment_type text;

-- Create storage bucket for DM media
INSERT INTO storage.buckets (id, name, public) VALUES ('dm-media', 'dm-media', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can upload to dm-media
CREATE POLICY "Authenticated users can upload dm media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'dm-media');

-- Storage RLS: authenticated users can read dm media
CREATE POLICY "Authenticated users can read dm media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'dm-media');

-- Create call_signals table for WebRTC signaling
CREATE TABLE public.call_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid NOT NULL,
  callee_id uuid NOT NULL,
  conversation_id uuid REFERENCES public.conversations(id),
  signal_type text NOT NULL, -- 'offer', 'answer', 'ice-candidate', 'call-request', 'call-accept', 'call-reject', 'call-end'
  signal_data jsonb,
  call_type text NOT NULL DEFAULT 'voice', -- 'voice' or 'video'
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;

-- Enable realtime for call signals
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals;

CREATE POLICY "Users can read their call signals"
ON public.call_signals FOR SELECT
USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE POLICY "Authenticated users can insert call signals"
ON public.call_signals FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Users can delete their call signals"
ON public.call_signals FOR DELETE
USING (auth.uid() = caller_id OR auth.uid() = callee_id);
