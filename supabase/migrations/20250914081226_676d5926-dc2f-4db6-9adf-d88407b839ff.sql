-- Fix security view issue by removing the secure view
-- The view was flagged as a security risk, so we'll remove it
DROP VIEW IF EXISTS public.secure_subscription_view;

-- Instead, create a secure function for admin/system access only
CREATE OR REPLACE FUNCTION public.admin_get_masked_subscription_data(target_user_id UUID DEFAULT NULL)
RETURNS TABLE(
  user_id UUID,
  subscribed BOOLEAN,
  subscription_tier TEXT,
  subscription_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  email_masked TEXT,
  stripe_id_masked TEXT
) AS $$
BEGIN
  -- Only allow service role access
  IF current_setting('role') != 'service_role' THEN
    RAISE EXCEPTION 'SECURITY: Unauthorized access to subscription data';
  END IF;

  -- Log admin access
  INSERT INTO subscriber_access_audit (
    user_id,
    accessed_subscriber_id,
    access_type,
    accessed_fields
  ) VALUES (
    NULL, -- System access
    target_user_id,
    'admin_masked_access',
    ARRAY['subscription_overview']
  );

  RETURN QUERY
  SELECT 
    s.user_id,
    s.subscribed,
    s.subscription_tier,
    s.subscription_end,
    s.created_at,
    -- Never expose email or stripe_customer_id directly
    '[PROTECTED]'::text as email_masked,
    CASE 
      WHEN s.stripe_customer_id IS NOT NULL 
      THEN public.mask_stripe_customer_id(s.stripe_customer_id)
      ELSE NULL 
    END as stripe_id_masked
  FROM subscribers s
  WHERE (target_user_id IS NULL OR s.user_id = target_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;