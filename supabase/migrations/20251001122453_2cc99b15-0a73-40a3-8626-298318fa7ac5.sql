-- Update system_manage_subscription function to set Advanced plan storage to 5TB (5120 GB)
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
        new_minutes_included := 15;
        new_storage_limit := 2048; -- 2TB
      WHEN 'advanced' THEN
        new_minutes_included := 80;
        new_storage_limit := 5120; -- 5TB (updated from 7TB)
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