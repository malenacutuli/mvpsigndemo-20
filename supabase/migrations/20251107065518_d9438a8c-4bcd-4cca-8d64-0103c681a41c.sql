-- Create secure admin function to view subscriber information with usernames
-- This function provides non-sensitive subscriber data for admin dashboards

CREATE OR REPLACE FUNCTION public.admin_get_subscriber_list()
RETURNS TABLE(
  user_id uuid,
  display_name text,
  subscription_tier text,
  is_active boolean,
  subscription_end timestamp with time zone,
  minutes_used integer,
  minutes_included integer,
  storage_used_gb numeric,
  storage_limit_gb integer,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow service role access for now
  -- TODO: Implement admin role check when admin system is built
  IF current_setting('role') != 'service_role' THEN
    RAISE EXCEPTION 'SECURITY: Unauthorized access to subscriber list. Admin privileges required.';
  END IF;

  -- Log admin access for security audit
  INSERT INTO subscriber_access_audit (
    user_id,
    accessed_subscriber_id,
    access_type,
    accessed_fields
  ) VALUES (
    NULL, -- System/admin access
    NULL, -- Accessing all subscribers
    'admin_list_access',
    ARRAY['user_id', 'display_name', 'subscription_tier', 'usage_stats']
  );

  -- Return subscriber data with display names (NO emails, NO Stripe IDs)
  RETURN QUERY
  SELECT 
    s.user_id,
    COALESCE(p.display_name, 'User ' || substring(s.user_id::text from 1 for 8)) as display_name,
    COALESCE(s.subscription_tier, 'free') as subscription_tier,
    s.subscribed as is_active,
    s.subscription_end,
    s.minutes_used,
    s.minutes_included,
    s.storage_used_gb,
    s.storage_limit_gb,
    s.created_at
  FROM subscribers s
  LEFT JOIN profiles p ON s.user_id = p.user_id
  ORDER BY s.created_at DESC;
END;
$$;

-- Create function to get subscriber statistics (aggregated, no PII)
CREATE OR REPLACE FUNCTION public.get_subscriber_stats()
RETURNS TABLE(
  total_subscribers bigint,
  active_subscribers bigint,
  free_tier_count bigint,
  starter_tier_count bigint,
  standard_tier_count bigint,
  advanced_tier_count bigint,
  total_storage_used_gb numeric,
  total_minutes_used bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function is safe to expose to authenticated users
  -- as it only returns aggregated statistics
  
  RETURN QUERY
  SELECT 
    COUNT(*)::bigint as total_subscribers,
    COUNT(CASE WHEN subscribed = true THEN 1 END)::bigint as active_subscribers,
    COUNT(CASE WHEN subscription_tier IS NULL OR subscription_tier = 'free' THEN 1 END)::bigint as free_tier_count,
    COUNT(CASE WHEN subscription_tier = 'starter' THEN 1 END)::bigint as starter_tier_count,
    COUNT(CASE WHEN subscription_tier = 'standard' THEN 1 END)::bigint as standard_tier_count,
    COUNT(CASE WHEN subscription_tier = 'advanced' THEN 1 END)::bigint as advanced_tier_count,
    COALESCE(SUM(storage_used_gb), 0) as total_storage_used_gb,
    COALESCE(SUM(minutes_used), 0)::bigint as total_minutes_used
  FROM subscribers;
END;
$$;

COMMENT ON FUNCTION public.admin_get_subscriber_list() IS 'Admin function to view subscriber information with display names. Does NOT expose emails or payment information. Requires service role access.';
COMMENT ON FUNCTION public.get_subscriber_stats() IS 'Returns aggregated subscriber statistics without exposing individual user data. Safe for authenticated users.';