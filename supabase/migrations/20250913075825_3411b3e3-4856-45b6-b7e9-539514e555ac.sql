-- Secure channel_subscriptions: remove confusing policies and add email hash protection

-- 1) Remove the confusing "Deny unauthorized subscription access" policy that conflicts with other policies
DROP POLICY IF EXISTS "Deny unauthorized subscription access" ON public.channel_subscriptions;
DROP POLICY IF EXISTS "Block all other subscription access" ON public.channel_subscriptions;
DROP POLICY IF EXISTS "Channel owners can view their subscribers with emails" ON public.channel_subscriptions;

-- 2) Add email hashing column for secure duplicate prevention and lookups
ALTER TABLE public.channel_subscriptions
  ADD COLUMN IF NOT EXISTS subscriber_email_hash text;

-- 3) Create function to hash emails consistently (using built-in digest)
CREATE OR REPLACE FUNCTION public.hash_email_consistent(p_email text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT encode(digest(lower(trim(COALESCE(p_email, ''))), 'sha256'), 'hex');
$$;

-- 4) Backfill email hashes for existing records and add trigger for new ones
UPDATE public.channel_subscriptions
SET subscriber_email_hash = public.hash_email_consistent(subscriber_email)
WHERE subscriber_email IS NOT NULL AND subscriber_email_hash IS NULL;

-- Trigger to automatically hash emails on insert/update
CREATE OR REPLACE FUNCTION public.hash_subscriber_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.subscriber_email IS NOT NULL THEN
    NEW.subscriber_email_hash := public.hash_email_consistent(NEW.subscriber_email);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hash_subscriber_email ON public.channel_subscriptions;
CREATE TRIGGER trg_hash_subscriber_email
BEFORE INSERT OR UPDATE OF subscriber_email ON public.channel_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.hash_subscriber_email();

-- 5) Create unique index to prevent duplicate email subscriptions per channel
CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_subscriptions_unique_email
  ON public.channel_subscriptions(channel_id, subscriber_email_hash)
  WHERE subscriber_email_hash IS NOT NULL;

-- 6) Ensure clear, non-conflicting RLS policies

-- Keep the existing policies that work:
-- - "Anonymous email subscriptions allowed" (for INSERT)
-- - "Authenticated users can subscribe to public channels" (for INSERT)
-- - "System can manage subscriptions" (for admin operations)

-- Ensure subscribers can view their own subscription status (needed by UI)
DROP POLICY IF EXISTS "Users view own subscription status only" ON public.channel_subscriptions;
CREATE POLICY "Users view own subscription status"
ON public.channel_subscriptions
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND subscriber_user_id = auth.uid() 
  AND subscriber_user_id IS NOT NULL
);

-- Channel owners can view their subscribers with a secure function (not direct SELECT)
-- This prevents unauthorized bulk email extraction while allowing legitimate channel management

-- 7) Secure function for channel owners to get subscriber info
CREATE OR REPLACE FUNCTION public.get_channel_subscriber_info(channel_uuid uuid)
RETURNS TABLE(
  subscriber_count integer,
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
    RAISE EXCEPTION 'Unauthorized: You can only view subscriber info for your own channels';
  END IF;

  SELECT 
    COUNT(*)::integer,
    COUNT(CASE WHEN subscriber_user_id IS NOT NULL THEN 1 END)::integer,
    COUNT(CASE WHEN subscriber_email IS NOT NULL OR subscriber_email_hash IS NOT NULL THEN 1 END)::integer,
    MAX(subscribed_at)
  INTO total_subs, auth_subs, email_subs, latest_sub
  FROM public.channel_subscriptions
  WHERE channel_id = channel_uuid;

  RETURN QUERY SELECT 
    COALESCE(total_subs, 0) as subscriber_count,
    COALESCE(auth_subs, 0) as authenticated_subscribers,
    COALESCE(email_subs, 0) as email_subscribers,
    latest_sub as latest_subscription;
END;
$$;

-- 8) Secure function for checking subscription by email hash (for duplicate prevention)
CREATE OR REPLACE FUNCTION public.check_email_subscription(channel_uuid uuid, email_to_check text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_hash text;
BEGIN
  -- Hash the provided email consistently
  email_hash := public.hash_email_consistent(email_to_check);
  
  -- Check if this email hash already exists for the channel
  RETURN EXISTS (
    SELECT 1 
    FROM public.channel_subscriptions 
    WHERE channel_id = channel_uuid 
    AND subscriber_email_hash = email_hash
  );
END;
$$;

-- 9) Add security comment
COMMENT ON TABLE public.channel_subscriptions IS 'Subscriber data with hashed emails for security. Direct email access restricted to secure functions only.';

-- 10) Create index for efficient lookups while preventing enumeration
CREATE INDEX IF NOT EXISTS idx_channel_subscriptions_secure_lookup
  ON public.channel_subscriptions(channel_id, subscriber_user_id)
  WHERE subscriber_user_id IS NOT NULL;