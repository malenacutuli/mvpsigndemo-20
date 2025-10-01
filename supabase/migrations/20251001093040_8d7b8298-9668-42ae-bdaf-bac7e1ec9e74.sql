-- Add usage tracking columns to subscribers table (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscribers' AND column_name = 'minutes_used') THEN
    ALTER TABLE public.subscribers ADD COLUMN minutes_used INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscribers' AND column_name = 'minutes_included') THEN
    ALTER TABLE public.subscribers ADD COLUMN minutes_included INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscribers' AND column_name = 'storage_used_gb') THEN
    ALTER TABLE public.subscribers ADD COLUMN storage_used_gb NUMERIC DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscribers' AND column_name = 'storage_limit_gb') THEN
    ALTER TABLE public.subscribers ADD COLUMN storage_limit_gb INTEGER DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscribers' AND column_name = 'billing_cycle_start') THEN
    ALTER TABLE public.subscribers ADD COLUMN billing_cycle_start TIMESTAMP WITH TIME ZONE DEFAULT now();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscribers' AND column_name = 'last_usage_reset') THEN
    ALTER TABLE public.subscribers ADD COLUMN last_usage_reset TIMESTAMP WITH TIME ZONE DEFAULT now();
  END IF;
END $$;

-- Create usage_records table (if not exists)
CREATE TABLE IF NOT EXISTS public.usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
  minutes_processed NUMERIC NOT NULL,
  processing_type TEXT NOT NULL,
  cost_eur NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  billing_cycle_start TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own usage records" ON public.usage_records;
DROP POLICY IF EXISTS "System can manage all usage records" ON public.usage_records;

-- Create RLS policies
CREATE POLICY "Users can view their own usage records"
ON public.usage_records
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage all usage records"
ON public.usage_records
FOR ALL
USING (current_setting('role') = 'service_role');

-- Create index
CREATE INDEX IF NOT EXISTS idx_usage_records_user_billing 
ON public.usage_records(user_id, billing_cycle_start);