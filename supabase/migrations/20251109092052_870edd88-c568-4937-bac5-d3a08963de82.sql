-- Update all database functions with correct overage rates
-- Creators (starter): €11.90/minute ✓
-- Standard: €8.99/minute (was 5.99)
-- Advanced: €5.99/minute (was 4.99)

-- 1. Update get_current_usage function
CREATE OR REPLACE FUNCTION public.get_current_usage(target_user_id uuid)
 RETURNS TABLE(minutes_used integer, minutes_included integer, minutes_remaining integer, storage_used_gb numeric, storage_limit_gb integer, storage_remaining_gb numeric, tier text, overage_rate_eur numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      WHEN sub_record.subscription_tier = 'standard' THEN 8.99
      WHEN sub_record.subscription_tier = 'advanced' THEN 5.99
      ELSE 0
    END::NUMERIC as overage_rate;
END;
$function$;

-- 2. Update track_video_processing_usage function
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
AS $function$
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

  -- Determine overage rate based on tier - CORRECT RATES
  overage_rate := CASE 
    WHEN tier = 'starter' THEN 11.90
    WHEN tier = 'standard' THEN 8.99
    WHEN tier = 'advanced' THEN 5.99
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
$function$;

-- 3. Update can_process_video function
CREATE OR REPLACE FUNCTION public.can_process_video(
  target_user_id UUID,
  video_duration_seconds INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub_record RECORD;
  minutes_needed INTEGER;
  available_minutes INTEGER;
  overage_rate NUMERIC;
  overage_cost NUMERIC;
  user_email TEXT;
BEGIN
  -- Get user email
  SELECT email INTO user_email FROM auth.users WHERE id = target_user_id;
  
  -- Test users have unlimited access
  IF public.is_test_user(user_email) THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'test_user',
      'tier', 'unlimited'
    );
  END IF;
  
  -- Get subscriber info
  SELECT * INTO sub_record FROM subscribers WHERE user_id = target_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'no_subscription',
      'tier', 'free'
    );
  END IF;
  
  minutes_needed := CEIL(video_duration_seconds / 60.0);
  available_minutes := sub_record.minutes_included - sub_record.minutes_used;
  
  -- Calculate overage rate - CORRECT RATES
  overage_rate := CASE 
    WHEN sub_record.subscription_tier = 'starter' THEN 11.90
    WHEN sub_record.subscription_tier = 'standard' THEN 8.99
    WHEN sub_record.subscription_tier = 'advanced' THEN 5.99
    ELSE 0
  END;
  
  -- Check if sufficient minutes available
  IF available_minutes < minutes_needed THEN
    overage_cost := (minutes_needed - available_minutes) * overage_rate;
    
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'overage_will_apply',
      'minutes_needed', minutes_needed,
      'available_minutes', available_minutes,
      'overage_minutes', minutes_needed - available_minutes,
      'overage_cost_eur', overage_cost,
      'overage_rate_eur', overage_rate,
      'tier', sub_record.subscription_tier
    );
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'reason', 'sufficient_minutes',
    'minutes_needed', minutes_needed,
    'available_minutes', available_minutes,
    'tier', sub_record.subscription_tier
  );
END;
$$;

-- 4. Update get_overages_report function
CREATE OR REPLACE FUNCTION public.get_overages_report()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  overage_minutes INTEGER,
  estimated_cost NUMERIC,
  subscription_tier TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.user_id,
    s.email,
    (s.minutes_used - s.minutes_included)::INTEGER as overage_minutes,
    ((s.minutes_used - s.minutes_included) * CASE 
      WHEN s.subscription_tier = 'starter' THEN 11.90
      WHEN s.subscription_tier = 'standard' THEN 8.99
      WHEN s.subscription_tier = 'advanced' THEN 5.99
      ELSE 0
    END)::NUMERIC(10,2) as estimated_cost,
    s.subscription_tier
  FROM subscribers s
  WHERE s.subscribed = true 
    AND s.minutes_used > s.minutes_included
  ORDER BY (s.minutes_used - s.minutes_included) DESC;
END;
$$;