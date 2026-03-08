
-- Drop all problematic RLS policies on conversations
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can read own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;

-- Drop all RLS policies on conversation_participants
DROP POLICY IF EXISTS "Users can read participants in own conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Authenticated users can add participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can read own participation" ON public.conversation_participants;

-- Drop all RLS policies on direct_messages
DROP POLICY IF EXISTS "Users can read own conversation messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.direct_messages;

-- Add user_one_id and user_two_id columns to conversations
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS user_one_id uuid;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS user_two_id uuid;

-- Create simple non-recursive RLS policies for conversations
CREATE POLICY "Users can create conversations"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_one_id AND user_one_id <> user_two_id);

CREATE POLICY "Users can read own conversations"
ON public.conversations FOR SELECT TO authenticated
USING (auth.uid() = user_one_id OR auth.uid() = user_two_id);

CREATE POLICY "Users can update own conversations"
ON public.conversations FOR UPDATE TO authenticated
USING (auth.uid() = user_one_id OR auth.uid() = user_two_id);

-- Create simple non-recursive RLS policies for direct_messages
CREATE POLICY "Users can read messages in their conversations"
ON public.direct_messages FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.conversations
  WHERE conversations.id = direct_messages.conversation_id
  AND (conversations.user_one_id = auth.uid() OR conversations.user_two_id = auth.uid())
));

CREATE POLICY "Users can send messages in their conversations"
ON public.direct_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = direct_messages.conversation_id
    AND (conversations.user_one_id = auth.uid() OR conversations.user_two_id = auth.uid())
  )
);

CREATE POLICY "Users can update messages in their conversations"
ON public.direct_messages FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.conversations
  WHERE conversations.id = direct_messages.conversation_id
  AND (conversations.user_one_id = auth.uid() OR conversations.user_two_id = auth.uid())
));

-- Update find_conversation_between to use new columns
CREATE OR REPLACE FUNCTION public.find_conversation_between(user_a uuid, user_b uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.conversations
  WHERE (user_one_id = user_a AND user_two_id = user_b)
     OR (user_one_id = user_b AND user_two_id = user_a)
  LIMIT 1
$$;

-- Keep conversation_participants RLS simple (read-only for legacy compatibility)
CREATE POLICY "Anyone can read participants"
ON public.conversation_participants FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated can add participants"
ON public.conversation_participants FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
