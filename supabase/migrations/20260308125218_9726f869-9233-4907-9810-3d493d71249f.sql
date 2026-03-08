
-- Fix conversation_participants SELECT policy (self-referencing bug causing infinite recursion)
DROP POLICY IF EXISTS "Users can read own participation" ON public.conversation_participants;
CREATE POLICY "Users can read own participation"
ON public.conversation_participants
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Fix conversations SELECT policy (wrong column reference)
DROP POLICY IF EXISTS "Users can read own conversations" ON public.conversations;
CREATE POLICY "Users can read own conversations"
ON public.conversations
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.conversation_participants
  WHERE conversation_participants.conversation_id = conversations.id
  AND conversation_participants.user_id = auth.uid()
));

-- Fix conversations UPDATE policy
DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
CREATE POLICY "Users can update own conversations"
ON public.conversations
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.conversation_participants
  WHERE conversation_participants.conversation_id = conversations.id
  AND conversation_participants.user_id = auth.uid()
));

-- Fix direct_messages policies that reference conversation_participants
DROP POLICY IF EXISTS "Users can read own conversation messages" ON public.direct_messages;
CREATE POLICY "Users can read own conversation messages"
ON public.direct_messages
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.conversation_participants
  WHERE conversation_participants.conversation_id = direct_messages.conversation_id
  AND conversation_participants.user_id = auth.uid()
));

DROP POLICY IF EXISTS "Users can send messages" ON public.direct_messages;
CREATE POLICY "Users can send messages"
ON public.direct_messages
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants
    WHERE conversation_participants.conversation_id = direct_messages.conversation_id
    AND conversation_participants.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update own messages" ON public.direct_messages;
CREATE POLICY "Users can update own messages"
ON public.direct_messages
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.conversation_participants
  WHERE conversation_participants.conversation_id = direct_messages.conversation_id
  AND conversation_participants.user_id = auth.uid()
));
