-- Create get_user_storage_usage function for storage validation
CREATE OR REPLACE FUNCTION public.get_user_storage_usage(target_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  storage_used_bytes BIGINT,
  storage_limit_bytes BIGINT,
  usage_percentage NUMERIC,
  is_near_limit BOOLEAN,
  is_over_limit BOOLEAN,
  tier TEXT,
  files_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_tier text;
  v_limit_gb integer;
  v_used_bytes bigint;
  v_file_count integer;
BEGIN
  -- If target_user_id is provided (from edge function), use it
  -- Otherwise use authenticated user (from client)
  IF target_user_id IS NOT NULL THEN
    v_user_id := target_user_id;
  ELSE
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'Authentication required';
    END IF;
  END IF;

  -- Get subscription tier and storage limit
  SELECT 
    COALESCE(subscription_tier, 'free'),
    COALESCE(storage_limit_gb, 1)
  INTO v_tier, v_limit_gb
  FROM subscribers
  WHERE user_id = v_user_id;

  -- If no subscriber record, use free tier defaults
  IF NOT FOUND THEN
    v_tier := 'free';
    v_limit_gb := 1;
  END IF;

  -- Calculate storage usage from videos table
  SELECT 
    COALESCE(SUM(file_size), 0),
    COUNT(*)
  INTO v_used_bytes, v_file_count
  FROM videos
  WHERE user_id = v_user_id;

  -- Return storage usage data
  RETURN QUERY SELECT
    v_used_bytes as storage_used_bytes,
    (v_limit_gb::bigint * 1073741824) as storage_limit_bytes, -- Convert GB to bytes
    CASE 
      WHEN v_limit_gb > 0 THEN (v_used_bytes::numeric / (v_limit_gb::bigint * 1073741824) * 100)
      ELSE 0
    END as usage_percentage,
    CASE 
      WHEN v_limit_gb > 0 THEN (v_used_bytes::numeric / (v_limit_gb::bigint * 1073741824)) >= 0.8
      ELSE false
    END as is_near_limit,
    CASE 
      WHEN v_limit_gb > 0 THEN v_used_bytes >= (v_limit_gb::bigint * 1073741824)
      ELSE false
    END as is_over_limit,
    v_tier as tier,
    v_file_count as files_count;
END;
$$;