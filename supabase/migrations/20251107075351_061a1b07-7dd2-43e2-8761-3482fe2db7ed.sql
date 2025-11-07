-- Create usage_notifications table to track sent alerts
CREATE TABLE IF NOT EXISTS public.usage_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('warning_minutes_80', 'warning_storage_80', 'overage_minutes', 'overage_storage')),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usage_snapshot JSONB NOT NULL,
  billing_cycle_start TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_usage_notifications_user_id ON public.usage_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_notifications_type_cycle ON public.usage_notifications(user_id, notification_type, billing_cycle_start);
CREATE INDEX IF NOT EXISTS idx_usage_notifications_sent_at ON public.usage_notifications(sent_at DESC);

-- Enable RLS
ALTER TABLE public.usage_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.usage_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Service role can insert notifications
CREATE POLICY "Service role can insert notifications"
  ON public.usage_notifications
  FOR INSERT
  WITH CHECK (true);

-- Function to get users approaching limits (>=80%)
CREATE OR REPLACE FUNCTION public.get_users_approaching_limits()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  minutes_used INTEGER,
  minutes_included INTEGER,
  minutes_percent NUMERIC,
  storage_used_gb NUMERIC,
  storage_limit_gb INTEGER,
  storage_percent NUMERIC,
  tier TEXT,
  billing_cycle_start TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.user_id,
    s.email,
    s.minutes_used,
    s.minutes_included,
    CASE 
      WHEN s.minutes_included > 0 THEN ROUND((s.minutes_used::NUMERIC / s.minutes_included::NUMERIC) * 100, 2)
      ELSE 0
    END as minutes_percent,
    s.storage_used_gb,
    s.storage_limit_gb,
    CASE 
      WHEN s.storage_limit_gb > 0 THEN ROUND((s.storage_used_gb / s.storage_limit_gb::NUMERIC) * 100, 2)
      ELSE 0
    END as storage_percent,
    s.subscription_tier as tier,
    s.billing_cycle_start
  FROM public.subscribers s
  WHERE s.subscribed = true
    AND s.email IS NOT NULL
    AND (
      -- Minutes at or above 80%
      (s.minutes_included > 0 AND (s.minutes_used::NUMERIC / s.minutes_included::NUMERIC) >= 0.80)
      OR
      -- Storage at or above 80%
      (s.storage_limit_gb > 0 AND (s.storage_used_gb / s.storage_limit_gb::NUMERIC) >= 0.80)
      OR
      -- Overage conditions
      (s.minutes_used > s.minutes_included)
      OR
      (s.storage_used_gb > s.storage_limit_gb)
    );
END;
$$;

-- Function to check if notification should be sent
CREATE OR REPLACE FUNCTION public.should_send_notification(
  target_user_id UUID,
  notif_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_cycle TIMESTAMP WITH TIME ZONE;
  last_sent TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get current billing cycle start
  SELECT billing_cycle_start INTO current_cycle
  FROM public.subscribers
  WHERE user_id = target_user_id;

  IF current_cycle IS NULL THEN
    RETURN false;
  END IF;

  -- Check if notification already sent in current cycle
  SELECT MAX(sent_at) INTO last_sent
  FROM public.usage_notifications
  WHERE user_id = target_user_id
    AND notification_type = notif_type
    AND billing_cycle_start = current_cycle;

  -- Don't send if already sent in current cycle within last 24 hours
  IF last_sent IS NOT NULL AND last_sent > (now() - INTERVAL '24 hours') THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- Function to record notification sent
CREATE OR REPLACE FUNCTION public.record_notification_sent(
  target_user_id UUID,
  notif_type TEXT,
  usage_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_cycle TIMESTAMP WITH TIME ZONE;
  notification_id UUID;
BEGIN
  -- Get current billing cycle start
  SELECT billing_cycle_start INTO current_cycle
  FROM public.subscribers
  WHERE user_id = target_user_id;

  -- Insert notification record
  INSERT INTO public.usage_notifications (
    user_id,
    notification_type,
    usage_snapshot,
    billing_cycle_start
  )
  VALUES (
    target_user_id,
    notif_type,
    usage_data,
    current_cycle
  )
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;

-- Function to get notification history
CREATE OR REPLACE FUNCTION public.get_notification_history(
  target_user_id UUID,
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
  id UUID,
  notification_type TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  usage_snapshot JSONB,
  billing_cycle_start TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow users to see their own history or service role
  IF auth.uid() IS NULL OR (auth.uid() != target_user_id AND current_setting('role') != 'service_role') THEN
    RAISE EXCEPTION 'Unauthorized access to notification history';
  END IF;

  RETURN QUERY
  SELECT 
    n.id,
    n.notification_type,
    n.sent_at,
    n.usage_snapshot,
    n.billing_cycle_start
  FROM public.usage_notifications n
  WHERE n.user_id = target_user_id
    AND n.sent_at > (now() - (days_back || ' days')::INTERVAL)
  ORDER BY n.sent_at DESC;
END;
$$;