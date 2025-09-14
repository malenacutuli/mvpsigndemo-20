-- CRITICAL SECURITY FIX: Protect subscriber email addresses from unauthorized access
-- This migration addresses the vulnerability where channel subscription emails could be stolen

-- First, drop the existing problematic policies
DROP POLICY IF EXISTS "Channel owners can access aggregated stats only" ON public.channel_subscriptions;
DROP POLICY IF EXISTS "Users can view own subscription status" ON public.channel_subscriptions;

-- Create a comprehensive DENY ALL policy as the foundation
CREATE POLICY "Block all direct access to subscription data"
ON public.channel_subscriptions
FOR ALL
TO public, authenticated
USING (false)
WITH CHECK (false);

-- Allow only service role for administrative operations
CREATE POLICY "Service role can manage subscriptions"
ON public.channel_subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow users to insert their own subscriptions (existing functionality)
CREATE POLICY "Users can subscribe to public channels"
ON public.channel_subscriptions
FOR INSERT
TO authenticated, anon
WITH CHECK (
  -- Verify channel is public
  EXISTS (
    SELECT 1 FROM public.channels 
    WHERE id = channel_subscriptions.channel_id 
    AND is_public = true
  )
  AND (
    -- Authenticated user subscribing with their ID
    (auth.uid() IS NOT NULL AND auth.uid() = subscriber_user_id AND subscriber_email IS NULL)
    OR
    -- Anonymous user subscribing with email only
    (auth.uid() IS NULL AND subscriber_user_id IS NULL AND subscriber_email IS NOT NULL)
    OR
    -- Authenticated user subscribing with email (matches their auth email)
    (auth.uid() IS NOT NULL AND subscriber_email = auth.email() AND subscriber_user_id IS NULL)
  )
);

-- Critical: Create secure function for channel owners to access ONLY aggregated stats
CREATE OR REPLACE FUNCTION public.get_secure_channel_subscriber_stats(channel_uuid uuid)
RETURNS TABLE(
  total_subscribers integer,
  latest_subscription_date timestamp with time zone,
  authenticated_subscriber_count integer,
  email_subscriber_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_count integer := 0;
  auth_count integer := 0;
  email_count integer := 0;
  latest_sub timestamptz := null;
BEGIN
  -- CRITICAL: Verify the requesting user owns the channel
  IF NOT EXISTS (
    SELECT 1 FROM public.channels 
    WHERE id = channel_uuid 
    AND user_id = auth.uid()
    AND auth.uid() IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'SECURITY: Unauthorized access to channel subscription data';
  END IF;

  -- Get aggregated statistics WITHOUT exposing individual email addresses
  SELECT 
    COUNT(*)::integer,
    COUNT(CASE WHEN subscriber_user_id IS NOT NULL THEN 1 END)::integer,
    COUNT(CASE WHEN subscriber_email IS NOT NULL THEN 1 END)::integer,
    MAX(subscribed_at)
  INTO total_count, auth_count, email_count, latest_sub
  FROM public.channel_subscriptions
  WHERE channel_id = channel_uuid;

  RETURN QUERY SELECT 
    COALESCE(total_count, 0) as total_subscribers,
    latest_sub as latest_subscription_date,
    COALESCE(auth_count, 0) as authenticated_subscriber_count,
    COALESCE(email_count, 0) as email_subscriber_count;
END;
$$;

-- Secure function for users to check ONLY their own subscription status
CREATE OR REPLACE FUNCTION public.check_my_subscription_status(channel_uuid uuid)
RETURNS TABLE(is_subscribed boolean, subscribed_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only authenticated users can check their subscription
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT false as is_subscribed, null::timestamp with time zone as subscribed_at;
    RETURN;
  END IF;

  -- Return subscription status without exposing email addresses
  RETURN QUERY
  SELECT 
    true as is_subscribed,
    cs.subscribed_at
  FROM public.channel_subscriptions cs
  WHERE cs.channel_id = channel_uuid
  AND (
    -- Match by user ID
    (cs.subscriber_user_id = auth.uid() AND cs.subscriber_user_id IS NOT NULL)
    OR
    -- Match by email for authenticated users
    (cs.subscriber_email = auth.email() AND cs.subscriber_email IS NOT NULL AND auth.email() IS NOT NULL)
  )
  LIMIT 1;
  
  -- If no subscription found, return false
  IF NOT FOUND THEN
    RETURN QUERY SELECT false as is_subscribed, null::timestamp with time zone as subscribed_at;
  END IF;
END;
$$;

-- Add audit logging for subscription access (security monitoring)
CREATE TABLE IF NOT EXISTS public.subscription_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  channel_id uuid,
  access_type text NOT NULL,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE public.subscription_access_audit ENABLE ROW LEVEL SECURITY;

-- Only service role can access audit logs
CREATE POLICY "Service role manages audit logs"
ON public.subscription_access_audit
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Block all other access to audit logs
CREATE POLICY "Block all access to audit logs"
ON public.subscription_access_audit
FOR ALL
TO public, authenticated
USING (false)
WITH CHECK (false);

-- Create audit trigger for subscription access monitoring
CREATE OR REPLACE FUNCTION public.audit_subscription_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log any access to subscription data for security monitoring
  INSERT INTO public.subscription_access_audit (
    user_id,
    channel_id,
    access_type,
    ip_address
  ) VALUES (
    COALESCE(auth.uid(), NULL),
    COALESCE(NEW.channel_id, OLD.channel_id),
    TG_OP,
    inet_client_addr()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add trigger to monitor subscription table access
CREATE TRIGGER audit_channel_subscriptions_access
  AFTER INSERT OR UPDATE OR DELETE ON public.channel_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.audit_subscription_access();

-- Update existing functions to use enhanced security
DROP FUNCTION IF EXISTS public.get_channel_subscriber_stats(uuid);
DROP FUNCTION IF EXISTS public.check_channel_subscription(uuid);
DROP FUNCTION IF EXISTS public.get_channel_stats(uuid);

-- Comment on the security measures
COMMENT ON POLICY "Block all direct access to subscription data" ON public.channel_subscriptions IS 
'SECURITY: Prevents direct access to subscription data containing email addresses. All access must go through secure functions.';

COMMENT ON FUNCTION public.get_secure_channel_subscriber_stats(uuid) IS 
'SECURITY: Provides channel owners with aggregated statistics without exposing individual subscriber email addresses.';

COMMENT ON FUNCTION public.check_my_subscription_status(uuid) IS 
'SECURITY: Allows users to check only their own subscription status without accessing other subscriber data.';

-- Ensure the audit table has proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_audit_user_id ON public.subscription_access_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_audit_channel_id ON public.subscription_access_audit(channel_id);
CREATE INDEX IF NOT EXISTS idx_subscription_audit_created_at ON public.subscription_access_audit(created_at);