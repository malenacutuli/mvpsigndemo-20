-- Add privacy-focused functions for IP address anonymization
CREATE OR REPLACE FUNCTION public.anonymize_ip_address(ip_addr inet)
RETURNS inet
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- For IPv4: Zero out the last octet (e.g., 192.168.1.123 -> 192.168.1.0)
  -- For IPv6: Zero out the last 64 bits for privacy
  IF family(ip_addr) = 4 THEN
    RETURN network(set_masklen(ip_addr, 24));
  ELSE
    RETURN network(set_masklen(ip_addr, 64));
  END IF;
END;
$$;

-- Add function to truncate user agent strings for privacy
CREATE OR REPLACE FUNCTION public.anonymize_user_agent(user_agent_str text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Keep only browser and major version, remove detailed system info
  IF user_agent_str IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Extract major browser info only (first 50 chars max)
  RETURN left(
    regexp_replace(
      user_agent_str, 
      '\(.*?\)', 
      '(system-info-removed)', 
      'g'
    ), 
    50
  );
END;
$$;

-- Add data retention function to automatically clean old analytics data
CREATE OR REPLACE FUNCTION public.cleanup_old_analytics_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete analytics data older than 2 years for privacy compliance
  DELETE FROM public.embed_analytics 
  WHERE created_at < NOW() - INTERVAL '2 years';
  
  DELETE FROM public.public_video_views 
  WHERE created_at < NOW() - INTERVAL '2 years';
  
  -- Log the cleanup (optional)
  RAISE NOTICE 'Cleaned up analytics data older than 2 years';
END;
$$;

-- Create triggers to automatically anonymize IP addresses and user agents on insert
CREATE OR REPLACE FUNCTION public.anonymize_embed_analytics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Anonymize IP address if present
  IF NEW.ip_address IS NOT NULL THEN
    NEW.ip_address = public.anonymize_ip_address(NEW.ip_address);
  END IF;
  
  -- Anonymize user agent if present
  IF NEW.user_agent IS NOT NULL THEN
    NEW.user_agent = public.anonymize_user_agent(NEW.user_agent);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.anonymize_video_views()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Anonymize IP address if present
  IF NEW.viewer_ip IS NOT NULL THEN
    NEW.viewer_ip = public.anonymize_ip_address(NEW.viewer_ip);
  END IF;
  
  -- Anonymize user agent if present  
  IF NEW.user_agent IS NOT NULL THEN
    NEW.user_agent = public.anonymize_user_agent(NEW.user_agent);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply triggers to automatically anonymize data on insert
DROP TRIGGER IF EXISTS anonymize_embed_analytics_trigger ON public.embed_analytics;
CREATE TRIGGER anonymize_embed_analytics_trigger
  BEFORE INSERT ON public.embed_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.anonymize_embed_analytics();

DROP TRIGGER IF EXISTS anonymize_video_views_trigger ON public.public_video_views;
CREATE TRIGGER anonymize_video_views_trigger
  BEFORE INSERT ON public.public_video_views
  FOR EACH ROW
  EXECUTE FUNCTION public.anonymize_video_views();

-- Add additional RLS policies to ensure complete privacy protection
-- (These reinforce the existing policies with more explicit restrictions)

-- Ensure no direct public access to sensitive analytics data
DROP POLICY IF EXISTS "Block public access to embed analytics" ON public.embed_analytics;
CREATE POLICY "Block public access to embed analytics"
ON public.embed_analytics
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "Block public access to video views" ON public.public_video_views;  
CREATE POLICY "Block public access to video views"
ON public.public_video_views
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Allow authenticated users to only INSERT their own analytics (not read)
DROP POLICY IF EXISTS "Authenticated users can track analytics" ON public.embed_analytics;
CREATE POLICY "Authenticated users can track analytics"
ON public.embed_analytics
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can track video views" ON public.public_video_views;
CREATE POLICY "Authenticated users can track video views"
ON public.public_video_views  
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Update existing policies to be more explicit about restrictions
DROP POLICY IF EXISTS "Video owners can view their analytics" ON public.embed_analytics;
CREATE POLICY "Video owners can view their analytics"
ON public.embed_analytics
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.videos 
    WHERE videos.id = embed_analytics.video_id 
    AND videos.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Video owners can view their video analytics" ON public.public_video_views;
CREATE POLICY "Video owners can view their video analytics"
ON public.public_video_views
FOR SELECT  
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.videos 
    WHERE videos.id = public_video_views.video_id 
    AND videos.user_id = auth.uid()
  )
);