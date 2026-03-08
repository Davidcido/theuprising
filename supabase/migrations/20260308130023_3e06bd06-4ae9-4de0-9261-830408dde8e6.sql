
-- Security definer function to find existing conversation between two users
CREATE OR REPLACE FUNCTION public.find_conversation_between(user_a uuid, user_b uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cp1.conversation_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = user_a AND cp2.user_id = user_b
  LIMIT 1
$$;

-- Update conversation_participants SELECT policy to allow seeing other participants in your conversations
DROP POLICY IF EXISTS "Users can read own participation" ON public.conversation_participants;
CREATE POLICY "Users can read participants in own conversations"
ON public.conversation_participants
FOR SELECT TO authenticated
USING (
  conversation_id IN (
    SELECT cp.conversation_id FROM public.conversation_participants cp WHERE cp.user_id = auth.uid()
  )
);
