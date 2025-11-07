-- ============================================================
-- PHASE 1: SIGNUP NOTIFICATIONS & USER PROVISIONING
-- ============================================================

-- Create function to handle new user signups with automatic provisioning
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_admin_user BOOLEAN := FALSE;
BEGIN
  -- Check if this is the admin user
  IF NEW.email = 'malena@axessible.ai' THEN
    is_admin_user := TRUE;
  END IF;

  -- Create subscriber record with appropriate tier
  INSERT INTO public.subscribers (
    user_id, 
    email, 
    subscribed, 
    subscription_tier,
    minutes_included,
    minutes_used,
    storage_limit_gb,
    storage_used_gb,
    billing_cycle_start
  ) VALUES (
    NEW.id,
    NEW.email,
    is_admin_user,  -- Admin is automatically subscribed
    CASE WHEN is_admin_user THEN 'admin' ELSE 'free' END,
    CASE WHEN is_admin_user THEN 999999 ELSE 0 END,  -- Admin: unlimited, Free: 0 minutes
    0,
    CASE WHEN is_admin_user THEN 999999 ELSE 1 END,  -- Admin: unlimited, Free: 1GB
    0,
    NOW()
  );

  -- Send signup notification email via HTTP POST
  -- Using pg_net extension to call edge function
  PERFORM net.http_post(
    url := 'https://faeyekynudyzeotbjfsj.supabase.co/functions/v1/send-signup-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhZXlla3ludWR5emVvdGJqZnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMDMyMzUsImV4cCI6MjA3MTc3OTIzNX0.ifRh6Lx1AsWMjSchaNqa5ELHnImOLWUMGtYZLGWD1Qw'
    ),
    body := jsonb_build_object(
      'userEmail', NEW.email,
      'displayName', COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
      'userId', NEW.id::text,
      'isAdmin', is_admin_user
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Attach trigger to auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_signup();

-- ============================================================
-- PHASE 2: STORAGE CONSTRAINTS
-- ============================================================

-- Function to get real-time storage usage with enforcement
CREATE OR REPLACE FUNCTION get_user_storage_usage(target_user_id UUID)
RETURNS TABLE(
  storage_used_bytes BIGINT,
  storage_limit_bytes BIGINT,
  usage_percentage NUMERIC,
  is_near_limit BOOLEAN,
  is_over_limit BOOLEAN,
  tier TEXT,
  files_count INTEGER
) 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  sub_record RECORD;
  total_storage BIGINT := 0;
  file_count INTEGER := 0;
BEGIN
  -- Get user email for super user check
  SELECT email INTO user_email FROM auth.users WHERE id = target_user_id;
  
  -- Super users get unlimited storage
  IF is_test_user(user_email) THEN
    RETURN QUERY SELECT 
      0::BIGINT as storage_used_bytes,
      999999999999999::BIGINT as storage_limit_bytes,
      0::NUMERIC as usage_percentage,
      false as is_near_limit,
      false as is_over_limit,
      'admin'::TEXT as tier,
      0::INTEGER as files_count;
    RETURN;
  END IF;
  
  -- Get subscriber info
  SELECT * INTO sub_record FROM subscribers WHERE user_id = target_user_id;
  
  IF NOT FOUND THEN
    -- No subscriber record, return free tier defaults
    RETURN QUERY SELECT 
      0::BIGINT,
      1073741824::BIGINT,  -- 1GB in bytes
      0::NUMERIC,
      false,
      false,
      'free'::TEXT,
      0::INTEGER;
    RETURN;
  END IF;
  
  -- Calculate actual storage from videos table
  SELECT 
    COALESCE(SUM(CAST(COALESCE(metadata->>'file_size', '0') AS BIGINT)), 0),
    COUNT(*)
  INTO total_storage, file_count
  FROM videos
  WHERE user_id = target_user_id;
  
  -- Update subscriber record with accurate storage
  UPDATE subscribers 
  SET storage_used_gb = (total_storage::NUMERIC / 1073741824.0)
  WHERE user_id = target_user_id;
  
  -- Calculate and return usage metrics
  RETURN QUERY SELECT
    total_storage,
    (sub_record.storage_limit_gb * 1073741824::BIGINT) as storage_limit_bytes,
    CASE 
      WHEN sub_record.storage_limit_gb > 0 THEN
        (total_storage::NUMERIC / (sub_record.storage_limit_gb * 1073741824::NUMERIC) * 100)
      ELSE 0
    END as usage_percentage,
    CASE 
      WHEN sub_record.storage_limit_gb > 0 THEN
        (total_storage::NUMERIC / (sub_record.storage_limit_gb * 1073741824::NUMERIC)) >= 0.80
      ELSE false
    END as is_near_limit,
    total_storage > (sub_record.storage_limit_gb * 1073741824::BIGINT) as is_over_limit,
    sub_record.subscription_tier,
    file_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PHASE 3: MINUTES CONSTRAINTS
-- ============================================================

-- Function to validate if user can process a video before starting
CREATE OR REPLACE FUNCTION can_process_video(
  target_user_id UUID,
  video_duration_seconds NUMERIC
) RETURNS JSONB 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  sub_record RECORD;
  minutes_needed NUMERIC;
  available_minutes INTEGER;
  overage_rate NUMERIC;
BEGIN
  -- Get user email for super user check
  SELECT email INTO user_email FROM auth.users WHERE id = target_user_id;
  
  -- Super users always allowed
  IF is_test_user(user_email) THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'super_user',
      'unlimited', true,
      'tier', 'admin'
    );
  END IF;
  
  -- Get subscriber info
  SELECT * INTO sub_record FROM subscribers WHERE user_id = target_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'no_subscription',
      'message', 'Please subscribe to a plan to process videos',
      'tier', 'free'
    );
  END IF;
  
  minutes_needed := CEIL(video_duration_seconds / 60.0);
  available_minutes := sub_record.minutes_included - sub_record.minutes_used;
  
  -- Calculate overage rate
  overage_rate := CASE 
    WHEN sub_record.subscription_tier = 'starter' THEN 11.90
    WHEN sub_record.subscription_tier = 'standard' THEN 5.99
    WHEN sub_record.subscription_tier = 'advanced' THEN 4.99
    ELSE 0
  END;
  
  -- Check if sufficient minutes available
  IF available_minutes < minutes_needed THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'insufficient_minutes',
      'minutes_needed', minutes_needed,
      'minutes_available', available_minutes,
      'minutes_used', sub_record.minutes_used,
      'minutes_included', sub_record.minutes_included,
      'overage_minutes', minutes_needed - available_minutes,
      'estimated_overage_cost', (minutes_needed - available_minutes) * overage_rate,
      'overage_rate', overage_rate,
      'tier', sub_record.subscription_tier,
      'message', format('Insufficient minutes. You need %s minutes but only have %s available. Estimated overage cost: €%s', 
                       minutes_needed, available_minutes, 
                       ((minutes_needed - available_minutes) * overage_rate)::NUMERIC(10,2))
    );
  END IF;
  
  -- Allowed to process
  RETURN jsonb_build_object(
    'allowed', true,
    'minutes_available', available_minutes,
    'minutes_needed', minutes_needed,
    'minutes_remaining_after', available_minutes - minutes_needed,
    'tier', sub_record.subscription_tier,
    'will_approach_limit', (sub_record.minutes_used + minutes_needed) >= (sub_record.minutes_included * 0.8)
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PHASE 4: BILLING CYCLE MANAGEMENT
-- ============================================================

-- Drop old version of reset_monthly_usage if exists
DROP FUNCTION IF EXISTS reset_monthly_usage(uuid);

-- Function to reset monthly usage for users whose billing cycle has ended
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS TABLE(reset_count INTEGER, user_ids UUID[])
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_users UUID[];
  reset_counter INTEGER := 0;
BEGIN
  -- Find and reset subscribers whose billing cycle has ended (30 days)
  WITH reset_users AS (
    UPDATE subscribers
    SET 
      minutes_used = 0,
      billing_cycle_start = NOW(),
      last_usage_reset = NOW()
    WHERE 
      billing_cycle_start <= (NOW() - INTERVAL '30 days')
      AND subscribed = true
    RETURNING user_id
  )
  SELECT ARRAY_AGG(user_id), COUNT(*)
  INTO affected_users, reset_counter
  FROM reset_users;
  
  -- Log the reset event
  IF reset_counter > 0 THEN
    RAISE NOTICE 'Billing cycle reset completed: % users affected', reset_counter;
  END IF;
  
  RETURN QUERY SELECT reset_counter, COALESCE(affected_users, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql;

-- Function to check and log overage warnings
CREATE OR REPLACE FUNCTION check_and_notify_overages()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  overage_minutes INTEGER,
  estimated_cost NUMERIC,
  tier TEXT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.user_id,
    s.email,
    (s.minutes_used - s.minutes_included)::INTEGER as overage_minutes,
    ((s.minutes_used - s.minutes_included) * CASE 
      WHEN s.subscription_tier = 'starter' THEN 11.90
      WHEN s.subscription_tier = 'standard' THEN 5.99
      WHEN s.subscription_tier = 'advanced' THEN 4.99
      ELSE 0
    END)::NUMERIC(10,2) as estimated_cost,
    s.subscription_tier
  FROM subscribers s
  WHERE s.subscribed = true 
    AND s.minutes_used > s.minutes_included
  ORDER BY (s.minutes_used - s.minutes_included) DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================

COMMENT ON FUNCTION handle_new_user_signup IS 'Automatically creates subscriber records and sends signup notifications when users register';
COMMENT ON FUNCTION get_user_storage_usage IS 'Calculates real-time storage usage and enforces tier limits with super user bypass';
COMMENT ON FUNCTION can_process_video IS 'Validates if user has sufficient minutes to process a video before starting transcription';
COMMENT ON FUNCTION reset_monthly_usage IS 'Resets monthly usage counters for subscribers whose 30-day billing cycle has ended - call via cron job';
COMMENT ON FUNCTION check_and_notify_overages IS 'Identifies users with overage usage for billing and notification purposes';