
-- Allow authenticated users to insert their own memories
CREATE POLICY "Users can insert own memories"
  ON public.ai_memories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to insert their own life events
CREATE POLICY "Users can insert own life events"
  ON public.life_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
