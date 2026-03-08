
-- Add reply_to_message_id to direct_messages
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS reply_to_message_id uuid REFERENCES public.direct_messages(id);

-- Make dm-media bucket public so images/audio are accessible
UPDATE storage.buckets SET public = true WHERE id = 'dm-media';
