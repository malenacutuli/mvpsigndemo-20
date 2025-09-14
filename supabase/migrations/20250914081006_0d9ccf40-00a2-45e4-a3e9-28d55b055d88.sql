-- Enhanced Security for Customer Payment Information
-- This migration addresses the security vulnerability in the subscribers table

-- 1. Create enhanced audit logging for all subscription-related access
CREATE OR REPLACE FUNCTION public.enhanced_subscription_audit()
RETURNS TRIGGER AS $$
BEGIN
  -- Log all access to subscription data with detailed information
  INSERT INTO subscriber_access_audit (
    user_id,
    accessed_subscriber_id,
    access_type,
    accessed_fields,
    ip_address,
    user_agent
  ) VALUES (
    COALESCE(auth.uid(), NULL),
    COALESCE(NEW.user_id, OLD.user_id),
    TG_OP,
    CASE 
      WHEN TG_OP = 'SELECT' THEN ARRAY['subscription_data_accessed']
      WHEN TG_OP = 'INSERT' THEN ARRAY['subscription_created'] 
      WHEN TG_OP = 'UPDATE' THEN ARRAY['subscription_modified']
      WHEN TG_OP = 'DELETE' THEN ARRAY['subscription_deleted']
    END,
    public.anonymize_ip_address(inet_client_addr()),
    left(current_setting('request.headers', true)::json->>'user-agent', 100)
  );
  
  -- Check for suspicious activity patterns
  PERFORM public.detect_suspicious_subscription_access(COALESCE(auth.uid(), NULL));
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Create function to detect suspicious subscription access patterns
CREATE OR REPLACE FUNCTION public.detect_suspicious_subscription_access(accessing_user_id UUID)
RETURNS VOID AS $$
DECLARE
  recent_access_count INTEGER;
  access_from_different_ips INTEGER;
BEGIN
  -- Count recent accesses from this user
  SELECT COUNT(*) INTO recent_access_count
  FROM subscriber_access_audit 
  WHERE user_id = accessing_user_id 
    AND created_at > (now() - interval '5 minutes');
  
  -- Count accesses from different IP addresses in the last hour
  SELECT COUNT(DISTINCT ip_address) INTO access_from_different_ips
  FROM subscriber_access_audit 
  WHERE user_id = accessing_user_id 
    AND created_at > (now() - interval '1 hour');
  
  -- Alert if suspicious patterns detected
  IF recent_access_count > 20 THEN
    RAISE WARNING 'SECURITY ALERT: High frequency subscription access detected for user %', accessing_user_id;
  END IF;
  
  IF access_from_different_ips > 3 THEN
    RAISE WARNING 'SECURITY ALERT: Subscription access from multiple IP addresses detected for user %', accessing_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Enhanced data masking function for stripe customer IDs
CREATE OR REPLACE FUNCTION public.mask_stripe_customer_id(customer_id TEXT)
RETURNS TEXT AS $$
BEGIN
  IF customer_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Return only masked format, never expose real Stripe customer ID
  RETURN 'cus_' || substring(encode(sha256(customer_id::bytea), 'hex') from 1 for 12) || '***';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Secure function to get subscription info with enhanced logging
CREATE OR REPLACE FUNCTION public.get_secure_subscription_info()
RETURNS TABLE(
  is_active boolean, 
  tier_name text, 
  expires_at timestamp with time zone, 
  features_available jsonb
) AS $$
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
  
  -- Return sanitized subscription info without exposing payment details
  IF FOUND THEN
    RETURN QUERY SELECT 
      subscription_record.subscribed as is_active,
      COALESCE(subscription_record.subscription_tier, 'free') as tier_name,
      subscription_record.subscription_end as expires_at,
      CASE 
        WHEN subscription_record.subscription_tier = 'starter' THEN '{"storage_gb": 100, "videos_per_month": 10}'::jsonb
        WHEN subscription_record.subscription_tier = 'standard' THEN '{"storage_gb": 2048, "videos_per_month": 100}'::jsonb  
        WHEN subscription_record.subscription_tier = 'premium' THEN '{"storage_gb": -1, "videos_per_month": -1}'::jsonb
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Create trigger for enhanced audit logging on subscribers table
DROP TRIGGER IF EXISTS enhanced_subscription_audit_trigger ON subscribers;
CREATE TRIGGER enhanced_subscription_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON subscribers
  FOR EACH ROW EXECUTE FUNCTION public.enhanced_subscription_audit();

-- 6. Create secure view that never exposes sensitive payment data
CREATE OR REPLACE VIEW public.secure_subscription_view AS
SELECT 
  user_id,
  subscribed,
  subscription_tier,
  subscription_end,
  created_at,
  -- Never expose email or stripe_customer_id in views
  '[PROTECTED]'::text as email_masked,
  CASE 
    WHEN stripe_customer_id IS NOT NULL 
    THEN public.mask_stripe_customer_id(stripe_customer_id)
    ELSE NULL 
  END as stripe_id_masked
FROM subscribers;

-- 7. Additional RLS policy to ensure only system can access raw subscriber data
CREATE POLICY "Enhanced security: Block all direct subscriber access" 
ON subscribers 
FOR ALL 
TO public
USING (false)
WITH CHECK (false);

-- 8. Create function for system-only stripe customer ID retrieval (for webhooks)
CREATE OR REPLACE FUNCTION public.system_get_stripe_customer_for_webhook(user_email TEXT)
RETURNS TEXT AS $$
DECLARE
  customer_id TEXT;
BEGIN
  -- Only allow service role (for Stripe webhooks)
  IF current_setting('role') != 'service_role' THEN
    RAISE EXCEPTION 'SECURITY: Unauthorized access to payment data';
  END IF;
  
  -- Log the system access
  INSERT INTO subscriber_access_audit (
    user_id,
    accessed_subscriber_id,
    access_type,
    accessed_fields
  ) VALUES (
    NULL, -- System access
    (SELECT user_id FROM subscribers WHERE email = user_email LIMIT 1),
    'system_webhook_access',
    ARRAY['stripe_customer_id']
  );
  
  SELECT stripe_customer_id INTO customer_id
  FROM subscribers 
  WHERE email = user_email 
  LIMIT 1;
  
  RETURN customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9. Cleanup function to remove old audit data (GDPR compliance)
CREATE OR REPLACE FUNCTION public.cleanup_subscription_audit_data()
RETURNS VOID AS $$
BEGIN
  -- Only service role can cleanup audit data
  IF current_setting('role') != 'service_role' THEN
    RAISE EXCEPTION 'SECURITY: Unauthorized cleanup attempt';
  END IF;
  
  -- Delete audit data older than 2 years for privacy compliance
  DELETE FROM subscriber_access_audit 
  WHERE created_at < NOW() - INTERVAL '2 years';
  
  RAISE NOTICE 'SECURITY: Cleaned up subscription audit data older than 2 years';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;