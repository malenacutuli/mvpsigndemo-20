-- Create channels table for organizing videos
CREATE TABLE public.channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  subscriber_count INTEGER NOT NULL DEFAULT 0,
  video_count INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create channel subscriptions table
CREATE TABLE public.channel_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL,
  subscriber_user_id UUID,
  subscriber_email TEXT,
  subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(channel_id, subscriber_user_id),
  UNIQUE(channel_id, subscriber_email)
);

-- Add channel_id to videos table
ALTER TABLE public.videos ADD COLUMN channel_id UUID;

-- Enable RLS on channels
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

-- Enable RLS on channel_subscriptions  
ALTER TABLE public.channel_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for channels
CREATE POLICY "Public channels are viewable by everyone" 
ON public.channels 
FOR SELECT 
USING (is_public = true);

CREATE POLICY "Users can create their own channels" 
ON public.channels 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own channels" 
ON public.channels 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own channels" 
ON public.channels 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage channels" 
ON public.channels 
FOR ALL 
USING (current_setting('role') = 'service_role');

-- RLS policies for channel subscriptions
CREATE POLICY "Anyone can subscribe to public channels" 
ON public.channel_subscriptions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM channels 
    WHERE channels.id = channel_subscriptions.channel_id 
    AND channels.is_public = true
  )
);

CREATE POLICY "Users can view their own subscriptions" 
ON public.channel_subscriptions 
FOR SELECT 
USING (
  auth.uid() = subscriber_user_id 
  OR subscriber_email = auth.email()
);

CREATE POLICY "Channel owners can view their subscribers" 
ON public.channel_subscriptions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM channels 
    WHERE channels.id = channel_subscriptions.channel_id 
    AND channels.user_id = auth.uid()
  )
);

CREATE POLICY "System can manage subscriptions" 
ON public.channel_subscriptions 
FOR ALL 
USING (current_setting('role') = 'service_role');

-- Function to update channel subscriber count
CREATE OR REPLACE FUNCTION public.update_subscriber_count()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger to update subscriber count
CREATE TRIGGER update_channel_subscriber_count
  AFTER INSERT OR DELETE ON channel_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_subscriber_count();

-- Function to update channel video count
CREATE OR REPLACE FUNCTION public.update_channel_video_count()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger to update video count
CREATE TRIGGER update_channel_video_count
  AFTER INSERT OR UPDATE OR DELETE ON videos
  FOR EACH ROW EXECUTE FUNCTION update_channel_video_count();

-- Create updated_at trigger for channels
CREATE TRIGGER update_channels_updated_at
  BEFORE UPDATE ON public.channels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();