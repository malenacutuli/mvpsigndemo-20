-- Fix security linter warnings by setting search_path for functions

-- Update the subscriber count function with proper search_path
CREATE OR REPLACE FUNCTION public.update_subscriber_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE channels SET subscriber_count = subscriber_count + 1 WHERE id = NEW.channel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE channels SET subscriber_count = subscriber_count - 1 WHERE id = OLD.channel_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Update the video count function with proper search_path
CREATE OR REPLACE FUNCTION public.update_channel_video_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.channel_id IS NOT NULL AND NEW.is_public = true THEN
    UPDATE channels SET video_count = video_count + 1 WHERE id = NEW.channel_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle channel assignment changes
    IF OLD.channel_id IS DISTINCT FROM NEW.channel_id OR OLD.is_public IS DISTINCT FROM NEW.is_public THEN
      -- Decrease count from old channel
      IF OLD.channel_id IS NOT NULL AND OLD.is_public = true THEN
        UPDATE channels SET video_count = video_count - 1 WHERE id = OLD.channel_id;
      END IF;
      -- Increase count for new channel
      IF NEW.channel_id IS NOT NULL AND NEW.is_public = true THEN
        UPDATE channels SET video_count = video_count + 1 WHERE id = NEW.channel_id;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.channel_id IS NOT NULL AND OLD.is_public = true THEN
    UPDATE channels SET video_count = video_count - 1 WHERE id = OLD.channel_id;
    RETURN OLD;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;