-- Add usage tracking columns to subscribers table
ALTER TABLE public.subscribers 
ADD COLUMN IF NOT EXISTS minutes_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS minutes_included INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS storage_used_gb NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS storage_limit_gb INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS billing_cycle_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS last_usage_reset TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create usage_records table to track video processing usage over time
CREATE TABLE IF NOT EXISTS public.usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
  minutes_processed NUMERIC NOT NULL,
  processing_type TEXT NOT NULL, -- 'transcription', 'audio_description', 'dubbing', etc.
  cost_eur NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  billing_cycle_start TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on usage_records
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;

-- RLS policies for usage_records
CREATE POLICY "Users can view their own usage records"
ON public.usage_records
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage all usage records"
ON public.usage_records
FOR ALL
USING (current_setting('role') = 'service_role');

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_usage_records_user_billing 
ON public.usage_records(user_id, billing_cycle_start);

-- Function to get current usage for a user
CREATE OR REPLACE FUNCTION public.get_current_usage(target_user_id UUID)
RETURNS TABLE(
  minutes_used INTEGER,
  minutes_included INTEGER,
  minutes_remaining INTEGER,
  storage_used_gb NUMERIC,
  storage_limit_gb INTEGER,
  storage_remaining_gb NUMERIC,
  tier TEXT,
  overage_rate_eur NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub_record RECORD;
BEGIN
  -- Only allow authenticated users to check their own usage
  IF auth.uid() IS NULL OR auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Unauthorized access';
  END IF;

  SELECT 
    s.minutes_used,
    s.minutes_included,
    s.storage_used_gb,
    s.storage_limit_gb,
    s.subscription_tier
  INTO sub_record
  FROM subscribers s
  WHERE s.user_id = target_user_id;

  -- Calculate overage rate based on tier
  RETURN QUERY SELECT 
    sub_record.minutes_used,
    sub_record.minutes_included,
    GREATEST(0, sub_record.minutes_included - sub_record.minutes_used) as minutes_remaining,
    sub_record.storage_used_gb,
    sub_record.storage_limit_gb,
    GREATEST(0, sub_record.storage_limit_gb - sub_record.storage_used_gb) as storage_remaining,
    sub_record.subscription_tier,
    CASE 
      WHEN sub_record.subscription_tier = 'starter' THEN 11.90
      WHEN sub_record.subscription_tier = 'standard' THEN 5.99
      WHEN sub_record.subscription_tier = 'advanced' THEN 4.99
      ELSE 0
    END::NUMERIC as overage_rate;
END;
$$;

-- Function to track video processing usage
CREATE OR REPLACE FUNCTION public.track_video_processing_usage(
  target_user_id UUID,
  video_uuid UUID,
  minutes_to_add NUMERIC,
  proc_type TEXT,
  meta JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_cycle_start TIMESTAMP WITH TIME ZONE;
  current_minutes INTEGER;
  included_minutes INTEGER;
  overage_cost NUMERIC := 0;
  overage_rate NUMERIC;
  tier TEXT;
BEGIN
  -- Get current subscription info
  SELECT 
    billing_cycle_start,
    minutes_used,
    minutes_included,
    subscription_tier
  INTO 
    current_cycle_start,
    current_minutes,
    included_minutes,
    tier
  FROM subscribers
  WHERE user_id = target_user_id;

  -- Determine overage rate
  overage_rate := CASE 
    WHEN tier = 'starter' THEN 11.90
    WHEN tier = 'standard' THEN 5.99
    WHEN tier = 'advanced' THEN 4.99
    ELSE 0
  END;

  -- Calculate overage cost if exceeding included minutes
  IF (current_minutes + minutes_to_add) > included_minutes THEN
    overage_cost := GREATEST(0, (current_minutes + minutes_to_add - included_minutes)) * overage_rate;
  END IF;

  -- Update subscriber minutes_used
  UPDATE subscribers 
  SET minutes_used = minutes_used + minutes_to_add::INTEGER
  WHERE user_id = target_user_id;

  -- Insert usage record
  INSERT INTO usage_records (
    user_id,
    video_id,
    minutes_processed,
    processing_type,
    cost_eur,
    billing_cycle_start,
    metadata
  ) VALUES (
    target_user_id,
    video_uuid,
    minutes_to_add,
    proc_type,
    overage_cost,
    current_cycle_start,
    meta
  );

  -- Return usage summary
  RETURN jsonb_build_object(
    'success', true,
    'minutes_added', minutes_to_add,
    'total_minutes_used', current_minutes + minutes_to_add::INTEGER,
    'minutes_included', included_minutes,
    'overage_cost_eur', overage_cost,
    'overage_rate_eur', overage_rate
  );
END;
$$;

-- Function to reset monthly usage (to be called by Stripe webhook on billing cycle)
CREATE OR REPLACE FUNCTION public.reset_monthly_usage(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow service role to call this
  IF current_setting('role') != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: Only service role can reset usage';
  END IF;

  UPDATE subscribers
  SET 
    minutes_used = 0,
    billing_cycle_start = now(),
    last_usage_reset = now()
  WHERE user_id = target_user_id;

  RETURN true;
END;
$$;

-- Update system_manage_subscription to set limits based on tier
CREATE OR REPLACE FUNCTION public.system_manage_subscription(
  target_user_id uuid, 
  stripe_customer text DEFAULT NULL, 
  tier text DEFAULT NULL, 
  is_active boolean DEFAULT NULL, 
  end_date timestamp with time zone DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_minutes_included INTEGER;
  new_storage_limit INTEGER;
BEGIN
  -- Only allow service role to call this function
  IF current_setting('role') != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: Only service role can manage subscription data';
  END IF;

  -- Set included minutes and storage based on tier
  IF tier IS NOT NULL THEN
    CASE tier
      WHEN 'starter' THEN
        new_minutes_included := 20;
        new_storage_limit := 100;
      WHEN 'standard' THEN
        new_minutes_included := 50;
        new_storage_limit := 2048; -- 2TB
      WHEN 'advanced' THEN
        new_minutes_included := 500;
        new_storage_limit := 7168; -- 7TB
      ELSE
        new_minutes_included := 0;
        new_storage_limit := 1;
    END CASE;
  END IF;

  -- Update subscription data with proper audit trail
  INSERT INTO subscriber_access_audit (
    user_id, 
    accessed_subscriber_id, 
    access_type, 
    accessed_fields
  ) VALUES (
    null, -- System access
    target_user_id,
    'update',
    ARRAY['stripe_customer_id', 'subscription_tier', 'subscribed', 'subscription_end', 'minutes_included', 'storage_limit_gb']
  );

  -- Perform the update
  UPDATE subscribers 
  SET 
    stripe_customer_id = COALESCE(stripe_customer, stripe_customer_id),
    subscription_tier = COALESCE(tier, subscription_tier),
    subscribed = COALESCE(is_active, subscribed),
    subscription_end = COALESCE(end_date, subscription_end),
    minutes_included = COALESCE(new_minutes_included, minutes_included),
    storage_limit_gb = COALESCE(new_storage_limit, storage_limit_gb),
    billing_cycle_start = CASE WHEN tier IS NOT NULL THEN now() ELSE billing_cycle_start END,
    updated_at = now()
  WHERE user_id = target_user_id;

  -- Reset usage if tier changed
  IF tier IS NOT NULL THEN
    UPDATE subscribers
    SET minutes_used = 0
    WHERE user_id = target_user_id;
  END IF;

  RETURN true;
END;
$$;