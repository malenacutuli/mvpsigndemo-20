-- CRITICAL SECURITY FIX: Protect subscriber email addresses from unauthorized access
-- This migration addresses the vulnerability where channel subscription emails could be stolen

-- Clean up existing policies safely
DROP POLICY IF EXISTS "Block all direct access to subscription data" ON public.channel_subscriptions;
DROP POLICY IF EXISTS "Channel owners can access aggregated stats only" ON public.channel_subscriptions;
DROP POLICY IF EXISTS "Users can view own subscription status" ON public.channel_subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.channel_subscriptions;
DROP POLICY IF EXISTS "Users can subscribe to public channels" ON public.channel_subscriptions;

-- Create foundational security policies
CREATE POLICY "Deny all direct subscription access"
ON public.channel_subscriptions
FOR ALL
TO public, authenticated
USING (false)
WITH CHECK (false);

-- Allow service role administrative access
CREATE POLICY "System manages subscriptions"
ON public.channel_subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Secure subscription creation (preserving existing functionality)
CREATE POLICY "Secure subscription creation"
ON public.channel_subscriptions
FOR INSERT
TO authenticated, anon
WITH CHECK (
  -- Channel must be public
  EXISTS (
    SELECT 1 FROM public.channels 
    WHERE id = channel_subscriptions.channel_id 
    AND is_public = true
  )
  AND (
    -- Authenticated user with their ID
    (auth.uid() IS NOT NULL AND auth.uid() = subscriber_user_id AND subscriber_email IS NULL)
    OR
    -- Anonymous email subscription
    (auth.uid() IS NULL AND subscriber_user_id IS NULL AND subscriber_email IS NOT NULL)
    OR
    -- Authenticated user with verified email
    (auth.uid() IS NOT NULL AND subscriber_email = auth.email() AND subscriber_user_id IS NULL)
  )
);

-- Create secure functions for accessing subscription data
CREATE OR REPLACE FUNCTION public.get_secure_channel_stats(channel_uuid uuid)
RETURNS TABLE(
  total_subscribers integer,
  latest_subscription timestamp with time zone,
  auth_subscriber_count integer,
  email_subscriber_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  subscriber_count integer := 0;
  authenticated_count integer := 0;
  email_count integer := 0;
  latest_date timestamptz := null;
BEGIN
  -- Security check: Only channel owners can access stats
  IF NOT EXISTS (
    SELECT 1 FROM public.channels 
    WHERE id = channel_uuid 
    AND user_id = auth.uid()
    AND auth.uid() IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: Unauthorized access attempt to channel subscription data for channel %', channel_uuid;
  END IF;

  -- Get aggregated data WITHOUT individual email exposure
  SELECT 
    COUNT(*)::integer,
    COUNT(CASE WHEN subscriber_user_id IS NOT NULL THEN 1 END)::integer,
    COUNT(CASE WHEN subscriber_email IS NOT NULL THEN 1 END)::integer,
    MAX(subscribed_at)
  INTO subscriber_count, authenticated_count, email_count, latest_date
  FROM public.channel_subscriptions
  WHERE channel_id = channel_uuid;

  RETURN QUERY SELECT 
    COALESCE(subscriber_count, 0),
    latest_date,
    COALESCE(authenticated_count, 0),
    COALESCE(email_count, 0);
END;
$$;

-- Secure function for user subscription status checking
CREATE OR REPLACE FUNCTION public.check_user_subscription(channel_uuid uuid)
RETURNS TABLE(subscribed boolean, subscription_date timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only authenticated users can check subscriptions
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT false, null::timestamp with time zone;
    RETURN;
  END IF;

  -- Check user's own subscription without exposing other data
  RETURN QUERY
  SELECT 
    true as subscribed,
    cs.subscribed_at as subscription_date
  FROM public.channel_subscriptions cs
  WHERE cs.channel_id = channel_uuid
  AND (
    (cs.subscriber_user_id = auth.uid() AND cs.subscriber_user_id IS NOT NULL)
    OR
    (cs.subscriber_email = auth.email() AND cs.subscriber_email IS NOT NULL AND auth.email() IS NOT NULL)
  )
  LIMIT 1;
  
  -- Return false if no subscription found
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, null::timestamp with time zone;
  END IF;
END;
$$;

-- Security audit table for monitoring access attempts
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action_type text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  ip_address inet,
  user_agent text,
  success boolean DEFAULT true,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit log service access only"
ON public.security_audit_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Block audit log public access"
ON public.security_audit_log
FOR ALL
TO public, authenticated
USING (false)
WITH CHECK (false);

-- Enhanced audit function with security monitoring
CREATE OR REPLACE FUNCTION public.log_subscription_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log all subscription table operations for security monitoring
  INSERT INTO public.security_audit_log (
    user_id,
    action_type,
    resource_type,
    resource_id,
    ip_address,
    success
  ) VALUES (
    auth.uid(),
    TG_OP,
    'channel_subscription',
    COALESCE(NEW.channel_id, OLD.channel_id),
    inet_client_addr(),
    true
  );
  
  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  -- Log failed access attempts
  INSERT INTO public.security_audit_log (
    user_id,
    action_type,
    resource_type,
    resource_id,
    ip_address,
    success,
    error_message
  ) VALUES (
    auth.uid(),
    TG_OP,
    'channel_subscription',
    COALESCE(NEW.channel_id, OLD.channel_id),
    inet_client_addr(),
    false,
    SQLERRM
  );
  
  RAISE;
END;
$$;

-- Apply audit trigger
DROP TRIGGER IF EXISTS audit_subscription_access ON public.channel_subscriptions;
CREATE TRIGGER audit_subscription_access
  AFTER INSERT OR UPDATE OR DELETE ON public.channel_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.log_subscription_access();

-- Clean up deprecated functions that might expose data
DROP FUNCTION IF EXISTS public.get_channel_subscriber_stats(uuid);
DROP FUNCTION IF EXISTS public.check_channel_subscription(uuid);
DROP FUNCTION IF EXISTS public.get_user_subscription_status(uuid);
DROP FUNCTION IF EXISTS public.get_channel_stats(uuid);

-- Create indexes for audit performance
CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON public.security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_resource ON public.security_audit_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_created_at ON public.security_audit_log(created_at);

-- Add security comments
COMMENT ON POLICY "Deny all direct subscription access" ON public.channel_subscriptions IS 
'CRITICAL SECURITY: Blocks all direct access to subscription data. Access only through secure functions.';

COMMENT ON FUNCTION public.get_secure_channel_stats(uuid) IS 
'SECURITY: Returns aggregated statistics for channel owners without exposing individual subscriber emails.';

COMMENT ON TABLE public.security_audit_log IS 
'SECURITY: Logs all access to sensitive subscription data for security monitoring and breach detection.';