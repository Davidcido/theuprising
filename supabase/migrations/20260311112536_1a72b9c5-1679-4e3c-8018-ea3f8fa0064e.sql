
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS real_name text DEFAULT NULL;

ALTER TABLE public.ai_memories ADD COLUMN IF NOT EXISTS importance_score integer DEFAULT 5;
ALTER TABLE public.ai_memories ADD COLUMN IF NOT EXISTS memory_type text DEFAULT 'general';
