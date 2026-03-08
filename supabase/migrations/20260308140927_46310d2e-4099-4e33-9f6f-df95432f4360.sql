
-- Add edited_at and deleted_for_everyone columns to direct_messages
ALTER TABLE public.direct_messages 
  ADD COLUMN edited_at timestamptz DEFAULT NULL,
  ADD COLUMN deleted_for_everyone boolean NOT NULL DEFAULT false;

-- Create message_hidden_for_user table for "delete for me"
CREATE TABLE public.message_hidden_for_user (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

ALTER TABLE public.message_hidden_for_user ENABLE ROW LEVEL SECURITY;

-- Users can see their own hidden entries
CREATE POLICY "Users can read own hidden messages"
  ON public.message_hidden_for_user
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can hide messages for themselves
CREATE POLICY "Users can hide messages"
  ON public.message_hidden_for_user
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can unhide messages
CREATE POLICY "Users can unhide messages"
  ON public.message_hidden_for_user
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
