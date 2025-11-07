-- SECURITY FIX: Replace get_user_storage_usage to use auth.uid() instead of parameter
-- This prevents users from accessing other users' storage data

DROP FUNCTION IF EXISTS get_user_storage_usage(UUID);

CREATE OR REPLACE FUNCTION get_user_storage_usage()
RETURNS TABLE(
  storage_used_bytes BIGINT,
  storage_limit_bytes BIGINT,
  usage_percentage NUMERIC,
  is_near_limit BOOLEAN,
  is_over_limit BOOLEAN,
  tier TEXT,
  files_count INTEGER
) 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  user_email TEXT;
  sub_record RECORD;
  total_storage BIGINT := 0;
  file_count INTEGER := 0;
BEGIN
  -- SECURITY: Get authenticated user ID from JWT token
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get user email for super user check
  SELECT email INTO user_email FROM auth.users WHERE id = current_user_id;
  
  -- Super users get unlimited storage
  IF is_test_user(user_email) THEN
    RETURN QUERY SELECT 
      0::BIGINT as storage_used_bytes,
      999999999999999::BIGINT as storage_limit_bytes,
      0::NUMERIC as usage_percentage,
      false as is_near_limit,
      false as is_over_limit,
      'admin'::TEXT as tier,
      0::INTEGER as files_count;
    RETURN;
  END IF;
  
  -- Get subscriber info for the authenticated user
  SELECT * INTO sub_record FROM subscribers WHERE user_id = current_user_id;
  
  IF NOT FOUND THEN
    -- No subscriber record, return free tier defaults
    RETURN QUERY SELECT 
      0::BIGINT,
      1073741824::BIGINT,  -- 1GB in bytes
      0::NUMERIC,
      false,
      false,
      'free'::TEXT,
      0::INTEGER;
    RETURN;
  END IF;
  
  -- Calculate actual storage from videos table for the authenticated user
  SELECT 
    COALESCE(SUM(CAST(COALESCE(metadata->>'file_size', '0') AS BIGINT)), 0),
    COUNT(*)
  INTO total_storage, file_count
  FROM videos
  WHERE user_id = current_user_id;
  
  -- Update subscriber record with accurate storage
  UPDATE subscribers 
  SET storage_used_gb = (total_storage::NUMERIC / 1073741824.0)
  WHERE user_id = current_user_id;
  
  -- Calculate and return usage metrics
  RETURN QUERY SELECT
    total_storage,
    (sub_record.storage_limit_gb * 1073741824::BIGINT) as storage_limit_bytes,
    CASE 
      WHEN sub_record.storage_limit_gb > 0 THEN
        (total_storage::NUMERIC / (sub_record.storage_limit_gb * 1073741824::NUMERIC) * 100)
      ELSE 0
    END as usage_percentage,
    CASE 
      WHEN sub_record.storage_limit_gb > 0 THEN
        (total_storage::NUMERIC / (sub_record.storage_limit_gb * 1073741824::NUMERIC) * 100) >= 80
      ELSE false
    END as is_near_limit,
    CASE 
      WHEN sub_record.storage_limit_gb > 0 THEN
        total_storage >= (sub_record.storage_limit_gb * 1073741824::BIGINT)
      ELSE false
    END as is_over_limit,
    sub_record.subscription_tier as tier,
    file_count as files_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_storage_usage IS 'SECURE: Calculates real-time storage usage for the authenticated user only. Uses auth.uid() to prevent unauthorized access to other users data.';