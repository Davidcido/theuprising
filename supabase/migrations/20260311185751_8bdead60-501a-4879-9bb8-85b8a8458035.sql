
-- Table to store AI chat conversations per user per companion
CREATE TABLE public.ai_chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  companion_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, companion_id)
);

ALTER TABLE public.ai_chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own ai conversations" ON public.ai_chat_conversations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai conversations" ON public.ai_chat_conversations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ai conversations" ON public.ai_chat_conversations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Table to store individual messages
CREATE TABLE public.ai_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_chat_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  attachments jsonb DEFAULT NULL,
  edited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own ai messages" ON public.ai_chat_messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.ai_chat_conversations c WHERE c.id = ai_chat_messages.conversation_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own ai messages" ON public.ai_chat_messages
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.ai_chat_conversations c WHERE c.id = ai_chat_messages.conversation_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Users can delete own ai messages" ON public.ai_chat_messages
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.ai_chat_conversations c WHERE c.id = ai_chat_messages.conversation_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Users can update own ai messages" ON public.ai_chat_messages
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.ai_chat_conversations c WHERE c.id = ai_chat_messages.conversation_id AND c.user_id = auth.uid())
  );
