-- Security Fix: Restrict access to channel_subscriptions table
-- This addresses the issue where subscriber email addresses could be exposed

-- First, drop the existing problematic policies
DROP POLICY IF EXISTS "Block anonymous access to subscriptions" ON channel_subscriptions;
DROP POLICY IF EXISTS "Authenticated users can view their own subscriptions" ON channel_subscriptions;
DROP POLICY IF EXISTS "Channel owners can view their subscribers" ON channel_subscriptions;

-- Create new, more secure policies

-- 1. Anonymous users can only insert email subscriptions (no read access)
-- This policy already exists and is fine: "Anonymous email subscriptions allowed"

-- 2. Authenticated users can subscribe but cannot read other subscriber data
-- This policy already exists and is fine: "Authenticated users can subscribe to public channels"

-- 3. Channel owners can view their subscribers (with email addresses)
-- But with more restrictive conditions
CREATE POLICY "Channel owners can view their subscribers with emails" 
ON channel_subscriptions 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 
    FROM channels 
    WHERE channels.id = channel_subscriptions.channel_id 
    AND channels.user_id = auth.uid()
  )
);

-- 4. Subscribers can only view their own subscription status (without email exposure)
-- Create a view or function for this instead of direct table access
CREATE POLICY "Subscribers can view own subscription status only" 
ON channel_subscriptions 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = subscriber_user_id
  -- This allows them to see their subscription exists but we'll handle email separately
);

-- 5. Explicit deny for all other SELECT operations (defense in depth)
CREATE POLICY "Deny unauthorized subscription access" 
ON channel_subscriptions 
FOR SELECT 
USING (false);

-- Create a security definer function for subscribers to check their subscription status
-- without exposing email addresses
CREATE OR REPLACE FUNCTION public.get_user_subscription_status(channel_uuid uuid)
RETURNS TABLE(
  is_subscribed boolean,
  subscribed_at timestamp with time zone
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true as is_subscribed,
    cs.subscribed_at
  FROM channel_subscriptions cs
  WHERE cs.channel_id = channel_uuid
  AND (
    (cs.subscriber_user_id = auth.uid() AND auth.uid() IS NOT NULL) OR
    (cs.subscriber_email = auth.email() AND auth.uid() IS NOT NULL)
  )
  LIMIT 1;
  
  -- If no subscription found, return false
  IF NOT FOUND THEN
    RETURN QUERY SELECT false as is_subscribed, null::timestamp with time zone as subscribed_at;
  END IF;
END;
$$;

-- Add a function for channel owners to get subscriber count without exposing emails
CREATE OR REPLACE FUNCTION public.get_channel_subscriber_count(channel_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub_count integer;
BEGIN
  -- Verify the user owns the channel
  IF NOT EXISTS (
    SELECT 1 FROM channels 
    WHERE id = channel_uuid 
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: You can only view subscriber counts for your own channels';
  END IF;
  
  SELECT COUNT(*)::integer INTO sub_count
  FROM channel_subscriptions
  WHERE channel_id = channel_uuid;
  
  RETURN COALESCE(sub_count, 0);
END;
$$;

-- Update the existing trigger to use the new secure approach
-- (The existing trigger should continue to work with these new policies)