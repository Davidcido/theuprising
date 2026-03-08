
-- Create message_reactions table
CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Users can read reactions on messages in their conversations
CREATE POLICY "Users can read reactions in their conversations"
  ON public.message_reactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.direct_messages dm
      JOIN public.conversations c ON c.id = dm.conversation_id
      WHERE dm.id = message_reactions.message_id
      AND (c.user_one_id = auth.uid() OR c.user_two_id = auth.uid())
    )
  );

-- Users can add reactions
CREATE POLICY "Users can add reactions"
  ON public.message_reactions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own reactions
CREATE POLICY "Users can remove own reactions"
  ON public.message_reactions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Enable realtime for message_reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
