-- Update storage limits for subscription tiers
-- Standard: 650GB (was 2TB/2048GB)
-- Advanced: 2TB/2048GB (was 5TB/5120GB)

-- Update the system_manage_subscription function with new storage limits
CREATE OR REPLACE FUNCTION public.system_manage_subscription(
  target_user_id uuid, 
  stripe_customer text DEFAULT NULL::text, 
  tier text DEFAULT NULL::text, 
  is_active boolean DEFAULT NULL::boolean, 
  end_date timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_minutes_included INTEGER;
  new_storage_limit INTEGER;
BEGIN
  -- Only allow service role to call this function
  IF current_setting('role') != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: Only service role can manage subscription data';
  END IF;

  -- Set included minutes and storage based on tier with UPDATED VALUES
  IF tier IS NOT NULL THEN
    CASE tier
      WHEN 'starter' THEN
        new_minutes_included := 5;
        new_storage_limit := 100;
      WHEN 'standard' THEN
        new_minutes_included := 10;
        new_storage_limit := 650; -- UPDATED: was 2048GB, now 650GB
      WHEN 'advanced' THEN
        new_minutes_included := 50;
        new_storage_limit := 2048; -- UPDATED: was 5120GB, now 2TB (2048GB)
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
$function$;

-- Update get_secure_subscription_info function with new storage limits
CREATE OR REPLACE FUNCTION public.get_secure_subscription_info()
RETURNS TABLE(is_active boolean, tier_name text, expires_at timestamp with time zone, features_available jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  subscription_record RECORD;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Ensure user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'SECURITY: Authentication required for subscription access';
  END IF;

  -- Enhanced audit logging with security metadata
  INSERT INTO subscriber_access_audit (
    user_id, 
    accessed_subscriber_id, 
    access_type, 
    accessed_fields,
    ip_address,
    user_agent
  ) VALUES (
    current_user_id,
    current_user_id,
    'secure_read',
    ARRAY['subscription_status', 'tier', 'expiry', 'features'],
    public.anonymize_ip_address(inet_client_addr()),
    public.anonymize_user_agent(current_setting('request.headers', true)::json->>'user-agent')
  );

  -- Check for suspicious access patterns
  PERFORM public.detect_suspicious_subscription_access(current_user_id);

  -- Get subscription data (never expose sensitive fields directly)
  SELECT 
    s.subscribed,
    s.subscription_tier,
    s.subscription_end
  INTO subscription_record
  FROM subscribers s
  WHERE s.user_id = current_user_id;
  
  -- Return sanitized subscription info without exposing payment details (UPDATED STORAGE LIMITS)
  IF FOUND THEN
    RETURN QUERY SELECT 
      subscription_record.subscribed as is_active,
      COALESCE(subscription_record.subscription_tier, 'free') as tier_name,
      subscription_record.subscription_end as expires_at,
      CASE 
        WHEN subscription_record.subscription_tier = 'starter' THEN '{"storage_gb": 100, "videos_per_month": 10}'::jsonb
        WHEN subscription_record.subscription_tier = 'standard' THEN '{"storage_gb": 650, "videos_per_month": 100}'::jsonb
        WHEN subscription_record.subscription_tier = 'advanced' THEN '{"storage_gb": 2048, "videos_per_month": -1}'::jsonb
        ELSE '{"storage_gb": 1, "videos_per_month": 1}'::jsonb
      END as features_available;
  ELSE
    -- Return secure defaults if no subscription found
    RETURN QUERY SELECT 
      false as is_active,
      'free'::text as tier_name,
      null::timestamp with time zone as expires_at,
      '{"storage_gb": 1, "videos_per_month": 1}'::jsonb as features_available;
  END IF;
END;
$function$;

-- Update get_user_subscription_info function with new storage limits
CREATE OR REPLACE FUNCTION public.get_user_subscription_info()
RETURNS TABLE(is_active boolean, tier_name text, expires_at timestamp with time zone, features_available jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Ensure user is authenticated
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Log the access (without sensitive data)
  INSERT INTO subscriber_access_audit (
    user_id, 
    accessed_subscriber_id, 
    access_type, 
    accessed_fields,
    ip_address
  ) VALUES (
    current_user_id,
    current_user_id,
    'read',
    ARRAY['subscribed', 'subscription_tier', 'subscription_end'],
    inet_client_addr()
  );

  -- Return sanitized subscription info (UPDATED STORAGE LIMITS)
  RETURN QUERY
  SELECT 
    s.subscribed as is_active,
    s.subscription_tier as tier_name,
    s.subscription_end as expires_at,
    CASE 
      WHEN s.subscription_tier = 'starter' THEN '{"storage_gb": 100, "videos_per_month": 10}'::jsonb
      WHEN s.subscription_tier = 'standard' THEN '{"storage_gb": 650, "videos_per_month": 100}'::jsonb
      WHEN s.subscription_tier = 'advanced' THEN '{"storage_gb": 2048, "videos_per_month": -1}'::jsonb
      ELSE '{"storage_gb": 1, "videos_per_month": 1}'::jsonb
    END as features_available
  FROM subscribers s
  WHERE s.user_id = current_user_id;
  
  -- If no subscription found, return default
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false as is_active,
      'free'::text as tier_name,
      null::timestamp with time zone as expires_at,
      '{"storage_gb": 1, "videos_per_month": 1}'::jsonb as features_available;
  END IF;
END;
$function$;

COMMENT ON FUNCTION public.system_manage_subscription IS 'Updated storage limits: Standard 650GB, Advanced 2TB';