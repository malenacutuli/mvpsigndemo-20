-- Phase 1: Test User Bypass & Enhanced Usage Tracking
-- Add test user identification function
CREATE OR REPLACE FUNCTION public.is_test_user(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Returns true for test users who should have unlimited access
  RETURN user_email IN ('malena@axessible.ai', 'test@axessible.ai');
END;
$$;

-- Update track_video_processing_usage to bypass tracking for test users
CREATE OR REPLACE FUNCTION public.track_video_processing_usage(
  target_user_id uuid, 
  video_uuid uuid, 
  minutes_to_add numeric, 
  proc_type text, 
  meta jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_cycle_start TIMESTAMP WITH TIME ZONE;
  current_minutes INTEGER;
  included_minutes INTEGER;
  overage_cost NUMERIC := 0;
  overage_rate NUMERIC;
  tier TEXT;
  user_email TEXT;
BEGIN
  -- Get user email from auth.users to check if test user
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = target_user_id;
  
  -- Skip all tracking and billing for test users
  IF public.is_test_user(user_email) THEN
    RETURN jsonb_build_object(
      'success', true,
      'test_user', true,
      'message', 'Usage tracking bypassed for test user - unlimited access granted',
      'minutes_added', minutes_to_add,
      'provider', meta->>'provider'
    );
  END IF;

  -- Get current subscription info for regular users
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

  -- If no subscriber record exists, create one with free tier defaults
  IF NOT FOUND THEN
    INSERT INTO subscribers (user_id, email, minutes_included, storage_limit_gb)
    VALUES (target_user_id, user_email, 0, 1)
    RETURNING billing_cycle_start, minutes_used, minutes_included, subscription_tier
    INTO current_cycle_start, current_minutes, included_minutes, tier;
  END IF;

  -- Determine overage rate based on tier
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

  -- Insert usage record with detailed metadata
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
    jsonb_build_object(
      'provider', meta->>'provider',
      'language', meta->>'language',
      'video_size', meta->>'videoSize',
      'timestamp', meta->>'timestamp',
      'tier', tier
    )
  );

  -- Return detailed usage summary
  RETURN jsonb_build_object(
    'success', true,
    'test_user', false,
    'minutes_added', minutes_to_add,
    'total_minutes_used', current_minutes + minutes_to_add::INTEGER,
    'minutes_included', included_minutes,
    'minutes_remaining', GREATEST(0, included_minutes - (current_minutes + minutes_to_add::INTEGER)),
    'overage_cost_eur', overage_cost,
    'overage_rate_eur', overage_rate,
    'tier', tier,
    'approaching_limit', (current_minutes + minutes_to_add::INTEGER) >= (included_minutes * 0.8)
  );
END;
$$;

-- Ensure videos table has duration_seconds column for tracking
ALTER TABLE videos ADD COLUMN IF NOT EXISTS duration_seconds NUMERIC;

-- Add helpful comment
COMMENT ON FUNCTION public.is_test_user IS 'Returns true for test users (malena@axessible.ai, test@axessible.ai) who should have unlimited access without billing';
COMMENT ON FUNCTION public.track_video_processing_usage IS 'Tracks video processing usage and calculates costs. Bypasses tracking for test users. Automatically creates subscriber record if needed.';