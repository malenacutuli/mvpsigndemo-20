-- Drop all versions of get_user_storage_usage function
DROP FUNCTION IF EXISTS public.get_user_storage_usage(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_storage_usage() CASCADE;

-- Grant admin role to malena@axessible.ai
INSERT INTO public.user_roles (user_id, role, granted_at)
VALUES (
  'e5721015-421d-40dc-919e-e91e1628af05',
  'admin',
  NOW()
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Clean up stuck video upload
DELETE FROM videos 
WHERE id = '59d50fea-e198-411d-97c0-816c13d82fa7' 
AND status = 'uploading' 
AND storage_path IS NULL;

-- Create updated get_user_storage_usage function with admin bypass
CREATE FUNCTION public.get_user_storage_usage(target_user_id uuid DEFAULT NULL)
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
  v_is_admin boolean;
BEGIN
  IF target_user_id IS NOT NULL THEN
    v_user_id := target_user_id;
  ELSE
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
      RAISE EXCEPTION 'Authentication required';
    END IF;
  END IF;

  v_is_admin := public.has_role(v_user_id, 'admin');

  SELECT 
    COALESCE(subscription_tier, 'free'),
    COALESCE(storage_limit_gb, 1)
  INTO v_tier, v_limit_gb
  FROM subscribers
  WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    v_tier := 'free';
    v_limit_gb := 1;
  END IF;

  SELECT 
    COALESCE(SUM(
      COALESCE(
        (metadata->>'size')::bigint,
        (metadata->>'fileSize')::bigint,
        0
      )
    ), 0),
    COUNT(*)
  INTO v_used_bytes, v_file_count
  FROM videos
  WHERE user_id = v_user_id;

  IF v_is_admin THEN
    RETURN QUERY SELECT
      v_used_bytes as storage_used_bytes,
      0::bigint as storage_limit_bytes,
      0::numeric as usage_percentage,
      false as is_near_limit,
      false as is_over_limit,
      'admin'::text as tier,
      v_file_count as files_count;
  ELSE
    RETURN QUERY SELECT
      v_used_bytes as storage_used_bytes,
      (v_limit_gb::bigint * 1073741824) as storage_limit_bytes,
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
  END IF;
END;
$$;

COMMENT ON FUNCTION get_user_storage_usage IS 'Calculates storage usage with admin bypass. Admins get unlimited storage (limit=0).';