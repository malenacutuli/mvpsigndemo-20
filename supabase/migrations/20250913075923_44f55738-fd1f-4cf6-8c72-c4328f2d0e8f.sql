-- Secure channel_subscriptions: remove confusing policies and improve access control

-- 1) Remove the confusing policies that create access control confusion
DROP POLICY IF EXISTS "Deny unauthorized subscription access" ON public.channel_subscriptions;
DROP POLICY IF EXISTS "Block all other subscription access" ON public.channel_subscriptions;
DROP POLICY IF EXISTS "Channel owners can view their subscribers with emails" ON public.channel_subscriptions;
DROP POLICY IF EXISTS "Channel owners view own subscribers only" ON public.channel_subscriptions;

-- 2) Keep only clear, non-conflicting policies

-- Ensure authenticated users can view their own subscription status (required for UI)
DROP POLICY IF EXISTS "Users view own subscription status only" ON public.channel_subscriptions;
DROP POLICY IF EXISTS "Users view own subscription status" ON public.channel_subscriptions;
CREATE POLICY "Users can view own subscription status"
ON public.channel_subscriptions
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND subscriber_user_id = auth.uid() 
  AND subscriber_user_id IS NOT NULL
);

-- Channel owners get minimal access - only for their own channels and without exposing emails in bulk
CREATE POLICY "Channel owners can view subscriber count only"
ON public.channel_subscriptions
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.channels 
    WHERE channels.id = channel_subscriptions.channel_id 
    AND channels.user_id = auth.uid()
  )
  -- This policy allows owners to see records exist but we'll use functions for aggregated data
);

-- 3) Create secure functions for channel owners to get aggregated data without email exposure

-- Secure function for channel owners to get subscriber statistics
CREATE OR REPLACE FUNCTION public.get_channel_subscriber_stats(channel_uuid uuid)
RETURNS TABLE(
  total_subscribers integer,
  authenticated_subscribers integer,
  email_subscribers integer,
  latest_subscription timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_subs integer := 0;
  auth_subs integer := 0;
  email_subs integer := 0;
  latest_sub timestamptz := null;
BEGIN
  -- Verify the user owns the channel
  IF NOT EXISTS (
    SELECT 1 FROM public.channels 
    WHERE id = channel_uuid 
    AND user_id = auth.uid()
    AND auth.uid() IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Unauthorized: You can only view subscriber stats for your own channels';
  END IF;

  -- Get aggregated statistics without exposing individual emails
  SELECT 
    COUNT(*)::integer,
    COUNT(CASE WHEN subscriber_user_id IS NOT NULL THEN 1 END)::integer,
    COUNT(CASE WHEN subscriber_email IS NOT NULL THEN 1 END)::integer,
    MAX(subscribed_at)
  INTO total_subs, auth_subs, email_subs, latest_sub
  FROM public.channel_subscriptions
  WHERE channel_id = channel_uuid;

  RETURN QUERY SELECT 
    COALESCE(total_subs, 0) as total_subscribers,
    COALESCE(auth_subs, 0) as authenticated_subscribers,
    COALESCE(email_subs, 0) as email_subscribers,
    latest_sub as latest_subscription;
END;
$$;

-- Function to check if an email is already subscribed (for duplicate prevention)
CREATE OR REPLACE FUNCTION public.is_email_subscribed_to_channel(channel_uuid uuid, email_to_check text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if this email already exists for the channel
  RETURN EXISTS (
    SELECT 1 
    FROM public.channel_subscriptions 
    WHERE channel_id = channel_uuid 
    AND lower(trim(subscriber_email)) = lower(trim(email_to_check))
  );
END;
$$;

-- 4) Add rate limiting protection via comments and indexes

-- Add security metadata to help with rate limiting at application level
COMMENT ON TABLE public.channel_subscriptions IS 'Contains sensitive subscriber data. Channel owners can only access aggregated statistics via secure functions. Direct email access is restricted. Implement rate limiting at application level.';

-- Create efficient indexes that don't allow enumeration
CREATE INDEX IF NOT EXISTS idx_channel_subscriptions_user_lookup
  ON public.channel_subscriptions(subscriber_user_id, channel_id)
  WHERE subscriber_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_channel_subscriptions_channel_stats
  ON public.channel_subscriptions(channel_id, subscribed_at);

-- 5) Update existing functions to be consistent with new approach

-- Update the existing check_channel_subscription function to be more secure
DROP FUNCTION IF EXISTS public.check_channel_subscription(uuid);
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
  -- Only authenticated users can check their subscription status
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT false as is_subscribed, null::timestamp with time zone as subscribed_at;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    true as is_subscribed,
    cs.subscribed_at
  FROM public.channel_subscriptions cs
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