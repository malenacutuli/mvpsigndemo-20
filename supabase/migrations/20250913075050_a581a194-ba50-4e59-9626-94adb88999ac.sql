-- Security Fix: Properly restrict access to channel_subscriptions table
-- This addresses the vulnerability where subscriber email addresses could be exposed

-- Drop ALL existing SELECT policies to avoid conflicts
DROP POLICY IF EXISTS "Channel owners can view their subscribers with emails" ON channel_subscriptions;
DROP POLICY IF EXISTS "Deny unauthorized subscription access" ON channel_subscriptions;
DROP POLICY IF EXISTS "Subscribers can view own subscription status only" ON channel_subscriptions;
DROP POLICY IF EXISTS "Block anonymous access to subscriptions" ON channel_subscriptions;
DROP POLICY IF EXISTS "Authenticated users can view their own subscriptions" ON channel_subscriptions;
DROP POLICY IF EXISTS "Channel owners can view their subscribers" ON channel_subscriptions;

-- 1. System/service role can manage all (keep this for admin operations)
-- This policy should already exist: "System can manage subscriptions"

-- 2. Channel owners can ONLY view their own subscribers (with strict verification)
CREATE POLICY "Channel owners view own subscribers only" 
ON channel_subscriptions 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 
    FROM channels 
    WHERE channels.id = channel_subscriptions.channel_id 
    AND channels.user_id = auth.uid()
    AND channels.user_id IS NOT NULL
  )
);

-- 3. Subscribers can ONLY check their own subscription status (no email exposure)
CREATE POLICY "Users view own subscription status only" 
ON channel_subscriptions 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND subscriber_user_id = auth.uid()
  AND subscriber_user_id IS NOT NULL
);

-- 4. Block all other unauthorized SELECT access (defense in depth)
CREATE POLICY "Block all other subscription access" 
ON channel_subscriptions 
FOR SELECT 
USING (false);

-- 5. Create secure functions for common operations without exposing emails

-- Function for users to check their subscription status safely
CREATE OR REPLACE FUNCTION public.check_channel_subscription(channel_uuid uuid)
RETURNS TABLE(
  is_subscribed boolean,
  subscribed_at timestamp with time zone
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only authenticated users can check subscriptions
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT false as is_subscribed, null::timestamp with time zone as subscribed_at;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    true as is_subscribed,
    cs.subscribed_at
  FROM channel_subscriptions cs
  WHERE cs.channel_id = channel_uuid
  AND (
    (cs.subscriber_user_id = auth.uid() AND cs.subscriber_user_id IS NOT NULL) OR
    (cs.subscriber_email = auth.email() AND cs.subscriber_email IS NOT NULL AND auth.email() IS NOT NULL)
  )
  LIMIT 1;
  
  -- If no subscription found, return false
  IF NOT FOUND THEN
    RETURN QUERY SELECT false as is_subscribed, null::timestamp with time zone as subscribed_at;
  END IF;
END;
$$;

-- Function for channel owners to get subscriber stats without exposing emails
CREATE OR REPLACE FUNCTION public.get_channel_stats(channel_uuid uuid)
RETURNS TABLE(
  subscriber_count integer,
  latest_subscription timestamp with time zone
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub_count integer := 0;
  latest_sub timestamp with time zone := null;
BEGIN
  -- Verify the user owns the channel
  IF NOT EXISTS (
    SELECT 1 FROM channels 
    WHERE id = channel_uuid 
    AND user_id = auth.uid()
    AND auth.uid() IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Unauthorized: You can only view stats for your own channels';
  END IF;
  
  SELECT 
    COUNT(*)::integer,
    MAX(subscribed_at)
  INTO sub_count, latest_sub
  FROM channel_subscriptions
  WHERE channel_id = channel_uuid;
  
  RETURN QUERY SELECT COALESCE(sub_count, 0), latest_sub;
END;
$$;

-- Add security metadata to the table
COMMENT ON TABLE channel_subscriptions IS 'Contains sensitive subscriber data. Access is restricted to channel owners and individual subscribers only. Rate limiting should be implemented at application level.';

-- Create secure index for efficient lookups without enumeration
DROP INDEX IF EXISTS idx_channel_subscriptions_secure;
CREATE INDEX idx_channel_subscriptions_secure 
ON channel_subscriptions (channel_id, subscriber_user_id) 
WHERE subscriber_user_id IS NOT NULL;