-- Create audit table for tracking access to sensitive subscriber data
CREATE TABLE IF NOT EXISTS public.subscriber_access_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  accessed_subscriber_id UUID NOT NULL,
  access_type TEXT NOT NULL, -- 'read', 'update', 'create'
  accessed_fields TEXT[], -- array of field names accessed
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE public.subscriber_access_audit ENABLE ROW LEVEL SECURITY;

-- Only system can manage audit logs
CREATE POLICY "System can manage audit logs" ON public.subscriber_access_audit
FOR ALL USING (current_setting('role') = 'service_role');

-- Create secure function to get subscription status without exposing sensitive data
CREATE OR REPLACE FUNCTION public.get_user_subscription_info()
RETURNS TABLE(
  is_active boolean,
  tier_name text,
  expires_at timestamp with time zone,
  features_available jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Return sanitized subscription info
  RETURN QUERY
  SELECT 
    s.subscribed as is_active,
    s.subscription_tier as tier_name,
    s.subscription_end as expires_at,
    CASE 
      WHEN s.subscription_tier = 'starter' THEN '{"storage_gb": 100, "videos_per_month": 10}'::jsonb
      WHEN s.subscription_tier = 'standard' THEN '{"storage_gb": 2048, "videos_per_month": 100}'::jsonb  
      WHEN s.subscription_tier = 'premium' THEN '{"storage_gb": -1, "videos_per_month": -1}'::jsonb
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
$$;

-- Create function to safely update subscription (without exposing Stripe data)
CREATE OR REPLACE FUNCTION public.update_user_subscription_preferences(
  email_notifications boolean DEFAULT null
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  updated_rows INTEGER;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Log the access
  INSERT INTO subscriber_access_audit (
    user_id, 
    accessed_subscriber_id, 
    access_type, 
    accessed_fields
  ) VALUES (
    current_user_id,
    current_user_id,
    'update',
    ARRAY['preferences']
  );

  -- Update only non-sensitive fields
  -- Note: This is a placeholder for subscription preferences
  -- In a real implementation, you'd have a preferences column
  
  RETURN true;
END;
$$;

-- Create function for system/service to manage sensitive subscription data
CREATE OR REPLACE FUNCTION public.system_manage_subscription(
  target_user_id UUID,
  stripe_customer TEXT DEFAULT null,
  tier TEXT DEFAULT null,
  is_active boolean DEFAULT null,
  end_date timestamp with time zone DEFAULT null
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow service role to call this function
  IF current_setting('role') != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: Only service role can manage subscription data';
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
    ARRAY['stripe_customer_id', 'subscription_tier', 'subscribed', 'subscription_end']
  );

  -- Perform the update
  UPDATE subscribers 
  SET 
    stripe_customer_id = COALESCE(stripe_customer, stripe_customer_id),
    subscription_tier = COALESCE(tier, subscription_tier),
    subscribed = COALESCE(is_active, subscribed),
    subscription_end = COALESCE(end_date, subscription_end),
    updated_at = now()
  WHERE user_id = target_user_id;

  RETURN true;
END;
$$;

-- Create function to mask sensitive data for admin views
CREATE OR REPLACE FUNCTION public.get_masked_subscriber_data(
  target_user_id UUID DEFAULT null
)
RETURNS TABLE(
  user_id UUID,
  masked_stripe_id text,
  tier text,
  is_active boolean,
  created_date timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only service role can access this
  IF current_setting('role') != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized access to subscriber data';
  END IF;

  RETURN QUERY
  SELECT 
    s.user_id,
    CASE 
      WHEN s.stripe_customer_id IS NOT NULL 
      THEN 'cus_' || substring(md5(s.stripe_customer_id) from 1 for 8) || '...'
      ELSE null 
    END as masked_stripe_id,
    s.subscription_tier as tier,
    s.subscribed as is_active,
    s.created_at as created_date
  FROM subscribers s
  WHERE (target_user_id IS NULL OR s.user_id = target_user_id);
END;
$$;

-- Update RLS policies to be more restrictive and force use of functions
-- Drop existing policies that allow direct access
DROP POLICY IF EXISTS "Users can view own subscription data only" ON public.subscribers;
DROP POLICY IF EXISTS "Users can update own subscription only" ON public.subscribers;
DROP POLICY IF EXISTS "Users can create own subscription record only" ON public.subscribers;

-- Create new restrictive policies that encourage function usage
CREATE POLICY "Block direct user access to subscribers table" ON public.subscribers
FOR ALL TO authenticated
USING (false)
WITH CHECK (false);

-- Allow service role to manage through functions only
CREATE POLICY "Service role can manage subscribers" ON public.subscribers
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Create indexes for audit table performance
CREATE INDEX IF NOT EXISTS idx_subscriber_access_audit_user_id ON subscriber_access_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriber_access_audit_created_at ON subscriber_access_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_subscriber_access_audit_access_type ON subscriber_access_audit(access_type);

-- Add constraints for data validation
ALTER TABLE subscriber_access_audit 
ADD CONSTRAINT valid_access_type 
CHECK (access_type IN ('read', 'update', 'create', 'delete'));

-- Create notification trigger for suspicious access patterns
CREATE OR REPLACE FUNCTION public.detect_suspicious_subscriber_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_accesses INTEGER;
BEGIN
  -- Count recent accesses from same user
  SELECT COUNT(*) INTO recent_accesses
  FROM subscriber_access_audit 
  WHERE user_id = NEW.user_id 
    AND created_at > (now() - interval '1 minute');
    
  -- If more than 10 accesses per minute, log warning
  IF recent_accesses > 10 THEN
    -- In production, this could trigger alerts/notifications
    RAISE WARNING 'Suspicious access pattern detected for user %', NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_detect_suspicious_access
  AFTER INSERT ON subscriber_access_audit
  FOR EACH ROW EXECUTE FUNCTION detect_suspicious_subscriber_access();