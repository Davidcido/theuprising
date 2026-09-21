CREATE TABLE public.feed_content_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  companion_name TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'reflection',
  media_type TEXT NOT NULL DEFAULT 'text',
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  visual_concept TEXT,
  theme TEXT,
  interactions JSONB NOT NULL DEFAULT '[]'::jsonb,
  engagement JSONB NOT NULL DEFAULT '{}'::jsonb,
  content_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  post_id UUID,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_feed_queue_due ON public.feed_content_queue (status, scheduled_at);
CREATE INDEX idx_feed_queue_sched ON public.feed_content_queue (scheduled_at DESC);

GRANT ALL ON public.feed_content_queue TO service_role;
ALTER TABLE public.feed_content_queue ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.feed_job_state (
  key TEXT NOT NULL PRIMARY KEY,
  lease_until TIMESTAMP WITH TIME ZONE,
  paused_until TIMESTAMP WITH TIME ZONE,
  pause_reason TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.feed_job_state TO service_role;
ALTER TABLE public.feed_job_state ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_feed_content_queue_updated_at
BEFORE UPDATE ON public.feed_content_queue
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feed_job_state_updated_at
BEFORE UPDATE ON public.feed_job_state
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Single-flight lease: returns true only when the caller acquires the lock
CREATE OR REPLACE FUNCTION public.acquire_feed_job_lease(_key TEXT, _seconds INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  acquired BOOLEAN;
BEGIN
  INSERT INTO public.feed_job_state (key, lease_until)
  VALUES (_key, now() + make_interval(secs => _seconds))
  ON CONFLICT (key) DO UPDATE
    SET lease_until = now() + make_interval(secs => _seconds),
        updated_at = now()
    WHERE public.feed_job_state.lease_until IS NULL
       OR public.feed_job_state.lease_until < now()
  RETURNING TRUE INTO acquired;

  RETURN COALESCE(acquired, FALSE);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.acquire_feed_job_lease(TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_feed_job_lease(TEXT, INTEGER) TO service_role;