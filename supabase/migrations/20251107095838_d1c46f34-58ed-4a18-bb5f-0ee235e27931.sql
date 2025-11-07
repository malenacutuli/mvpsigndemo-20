-- Create API rate limiting infrastructure
-- This tracks API requests per user and enforces limits based on subscription tier

-- Table to track API requests
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_request_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_user_endpoint_window 
ON public.api_rate_limits(user_id, endpoint, window_start);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_window_start 
ON public.api_rate_limits(window_start);

-- Enable RLS
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own rate limit data
CREATE POLICY "Users can view own rate limits"
ON public.api_rate_limits
FOR SELECT
USING (auth.uid() = user_id);

-- Function to check and enforce rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_window_minutes INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_current_count INTEGER := 0;
  v_tier TEXT;
  v_rate_limit INTEGER;
  v_user_email TEXT;
  v_is_test_user BOOLEAN := false;
BEGIN
  -- Get current window start (rounded to the minute)
  v_window_start := date_trunc('minute', now());
  
  -- Get user email for test user check
  SELECT email INTO v_user_email 
  FROM auth.users 
  WHERE id = p_user_id;
  
  -- Check if test user (unlimited access)
  v_is_test_user := public.is_test_user(v_user_email);
  
  IF v_is_test_user THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'test_user', true,
      'message', 'Test user - unlimited access'
    );
  END IF;
  
  -- Get user's subscription tier
  SELECT subscription_tier INTO v_tier
  FROM subscribers
  WHERE user_id = p_user_id;
  
  -- Set rate limits based on tier (requests per minute)
  v_rate_limit := CASE COALESCE(v_tier, 'free')
    WHEN 'advanced' THEN 500
    WHEN 'standard' THEN 100
    WHEN 'starter' THEN 30
    ELSE 10 -- free tier
  END;
  
  -- Get or create rate limit record for this window
  INSERT INTO public.api_rate_limits (
    user_id, 
    endpoint, 
    window_start, 
    request_count,
    last_request_at
  )
  VALUES (
    p_user_id, 
    p_endpoint, 
    v_window_start, 
    1,
    now()
  )
  ON CONFLICT ON CONSTRAINT api_rate_limits_pkey
  DO NOTHING;
  
  -- Get current count for this window
  SELECT request_count INTO v_current_count
  FROM public.api_rate_limits
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND window_start = v_window_start
  FOR UPDATE;
  
  -- Check if limit exceeded
  IF v_current_count >= v_rate_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'limit', v_rate_limit,
      'current', v_current_count,
      'tier', COALESCE(v_tier, 'free'),
      'retry_after', EXTRACT(EPOCH FROM (v_window_start + interval '1 minute' - now()))::INTEGER,
      'message', format('Rate limit exceeded. Limit: %s requests per minute for %s tier', v_rate_limit, COALESCE(v_tier, 'free'))
    );
  END IF;
  
  -- Increment counter
  UPDATE public.api_rate_limits
  SET request_count = request_count + 1,
      last_request_at = now()
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND window_start = v_window_start;
  
  -- Return success
  RETURN jsonb_build_object(
    'allowed', true,
    'limit', v_rate_limit,
    'current', v_current_count + 1,
    'remaining', v_rate_limit - v_current_count - 1,
    'tier', COALESCE(v_tier, 'free'),
    'message', 'Request allowed'
  );
END;
$function$;

-- Function to get user's current rate limit status
CREATE OR REPLACE FUNCTION public.get_rate_limit_status(
  p_user_id UUID,
  p_endpoint TEXT DEFAULT NULL
)
RETURNS TABLE(
  endpoint TEXT,
  current_count INTEGER,
  limit_per_minute INTEGER,
  remaining INTEGER,
  window_resets_in INTEGER,
  tier TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tier TEXT;
  v_rate_limit INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  -- Only allow users to check their own rate limits
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized access';
  END IF;
  
  v_window_start := date_trunc('minute', now());
  
  -- Get user's subscription tier
  SELECT subscription_tier INTO v_tier
  FROM subscribers
  WHERE user_id = p_user_id;
  
  -- Set rate limit based on tier
  v_rate_limit := CASE COALESCE(v_tier, 'free')
    WHEN 'advanced' THEN 500
    WHEN 'standard' THEN 100
    WHEN 'starter' THEN 30
    ELSE 10
  END;
  
  -- Return rate limit status for specified endpoint or all endpoints
  RETURN QUERY
  SELECT 
    rl.endpoint,
    rl.request_count as current_count,
    v_rate_limit as limit_per_minute,
    GREATEST(0, v_rate_limit - rl.request_count) as remaining,
    EXTRACT(EPOCH FROM (rl.window_start + interval '1 minute' - now()))::INTEGER as window_resets_in,
    COALESCE(v_tier, 'free') as tier
  FROM public.api_rate_limits rl
  WHERE rl.user_id = p_user_id
    AND rl.window_start = v_window_start
    AND (p_endpoint IS NULL OR rl.endpoint = p_endpoint)
  ORDER BY rl.last_request_at DESC;
END;
$function$;

-- Function to cleanup old rate limit records (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete records older than 1 hour
  DELETE FROM public.api_rate_limits
  WHERE window_start < (now() - interval '1 hour');
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$function$;

-- Audit table for rate limit violations
CREATE TABLE IF NOT EXISTS public.rate_limit_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  attempted_count INTEGER NOT NULL,
  limit_exceeded INTEGER NOT NULL,
  tier TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for violation analysis
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_user_created 
ON public.rate_limit_violations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_created 
ON public.rate_limit_violations(created_at DESC);

-- Enable RLS on violations table
ALTER TABLE public.rate_limit_violations ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can view violations (for admin monitoring)
CREATE POLICY "Service role can view violations"
ON public.rate_limit_violations
FOR SELECT
USING (current_setting('role') = 'service_role');

-- Function to log rate limit violations
CREATE OR REPLACE FUNCTION public.log_rate_limit_violation(
  p_user_id UUID,
  p_endpoint TEXT,
  p_attempted_count INTEGER,
  p_limit INTEGER,
  p_tier TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.rate_limit_violations (
    user_id,
    endpoint,
    attempted_count,
    limit_exceeded,
    tier,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_endpoint,
    p_attempted_count,
    p_limit,
    p_tier,
    p_ip_address,
    p_user_agent
  );
END;
$function$;

COMMENT ON TABLE public.api_rate_limits IS 'Tracks API request counts per user per endpoint per time window';
COMMENT ON TABLE public.rate_limit_violations IS 'Logs rate limit violations for security monitoring and abuse detection';
COMMENT ON FUNCTION public.check_rate_limit IS 'Checks if user can make request based on subscription tier limits. Returns allowed status and metadata.';
COMMENT ON FUNCTION public.get_rate_limit_status IS 'Returns current rate limit status for authenticated user';
COMMENT ON FUNCTION public.cleanup_old_rate_limits IS 'Removes rate limit records older than 1 hour to prevent table bloat';