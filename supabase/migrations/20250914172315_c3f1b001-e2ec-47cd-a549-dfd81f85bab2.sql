-- SECURITY PATCH: Fix channel subscription email exposure vulnerability
-- Drop all existing policies with CASCADE to ensure clean state
DROP POLICY IF EXISTS "Anonymous email subscriptions allowed" ON public.channel_subscriptions CASCADE;
DROP POLICY IF EXISTS "Authenticated users can subscribe to public channels" ON public.channel_subscriptions CASCADE;
DROP POLICY IF EXISTS "Channel owners can access aggregated stats only" ON public.channel_subscriptions CASCADE;
DROP POLICY IF EXISTS "System can manage subscriptions" ON public.channel_subscriptions CASCADE;
DROP POLICY IF EXISTS "Users can view own subscription status" ON public.channel_subscriptions CASCADE;
DROP POLICY IF EXISTS "Deny all direct subscription access" ON public.channel_subscriptions CASCADE;
DROP POLICY IF EXISTS "Block all direct access to subscription data" ON public.channel_subscriptions CASCADE;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.channel_subscriptions CASCADE;
DROP POLICY IF EXISTS "Users can subscribe to public channels" ON public.channel_subscriptions CASCADE;
DROP POLICY IF EXISTS "Secure subscription creation" ON public.channel_subscriptions CASCADE;
DROP POLICY IF EXISTS "System manages subscriptions" ON public.channel_subscriptions CASCADE;

-- Create new secure policies with unique names
CREATE POLICY "security_patch_block_all_access_2025"
ON public.channel_subscriptions
FOR ALL
TO public, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "security_patch_service_role_only_2025"
ON public.channel_subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "security_patch_insert_subscriptions_2025"
ON public.channel_subscriptions
FOR INSERT
TO authenticated, anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.channels 
    WHERE id = channel_subscriptions.channel_id 
    AND is_public = true
  )
  AND (
    (auth.uid() IS NOT NULL AND auth.uid() = subscriber_user_id AND subscriber_email IS NULL)
    OR
    (auth.uid() IS NULL AND subscriber_user_id IS NULL AND subscriber_email IS NOT NULL)
    OR
    (auth.uid() IS NOT NULL AND subscriber_email = auth.email() AND subscriber_user_id IS NULL)
  )
);

-- Create secure access functions
CREATE OR REPLACE FUNCTION public.secure_get_channel_stats_v2(channel_uuid uuid)
RETURNS TABLE(
  total_subscribers integer,
  latest_subscription_date timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_count integer := 0;
  latest_date timestamptz := null;
BEGIN
  -- Verify channel ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.channels 
    WHERE id = channel_uuid 
    AND user_id = auth.uid()
    AND auth.uid() IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Unauthorized access to channel statistics';
  END IF;

  -- Return only aggregated data - NO INDIVIDUAL EMAILS
  SELECT COUNT(*), MAX(subscribed_at)
  INTO total_count, latest_date
  FROM public.channel_subscriptions
  WHERE channel_id = channel_uuid;

  RETURN QUERY SELECT 
    COALESCE(total_count, 0),
    latest_date;
END;
$$;

CREATE OR REPLACE FUNCTION public.secure_check_subscription_status_v2(channel_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.channel_subscriptions
    WHERE channel_id = channel_uuid
    AND (
      (subscriber_user_id = auth.uid() AND subscriber_user_id IS NOT NULL)
      OR
      (subscriber_email = auth.email() AND subscriber_email IS NOT NULL AND auth.email() IS NOT NULL)
    )
  );
END;
$$;

-- Security monitoring table
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid,
  resource_id uuid,
  ip_address inet,
  timestamp timestamptz DEFAULT now(),
  details jsonb
);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "security_events_service_only"
ON public.security_events
FOR ALL
TO service_role
USING (true);

CREATE POLICY "security_events_block_public"
ON public.security_events
FOR ALL
TO public, authenticated
USING (false);

-- Add security comments
COMMENT ON POLICY "security_patch_block_all_access_2025" ON public.channel_subscriptions IS 
'SECURITY CRITICAL: Blocks all direct database access to prevent email harvesting';

COMMENT ON FUNCTION public.secure_get_channel_stats_v2(uuid) IS 
'SECURITY: Channel owners get stats WITHOUT individual subscriber emails';

-- Drop any potentially vulnerable legacy functions
DROP FUNCTION IF EXISTS public.get_channel_subscriber_count(uuid);
DROP FUNCTION IF EXISTS public.is_email_subscribed_to_channel(uuid, text);

COMMENT ON TABLE public.channel_subscriptions IS 
'SECURITY: Contains sensitive subscriber emails. Access ONLY through approved secure functions.';