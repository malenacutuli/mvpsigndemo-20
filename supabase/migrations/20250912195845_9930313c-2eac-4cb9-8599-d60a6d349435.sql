-- Fix security vulnerability in channel_subscriptions table
-- Remove potentially vulnerable email-based access and tighten permissions

-- Drop existing potentially vulnerable policies
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.channel_subscriptions;

-- Create more secure policy for authenticated users to view their own subscriptions
-- Only allow access based on user_id, not email to prevent spoofing
CREATE POLICY "Authenticated users can view their own subscriptions" 
ON public.channel_subscriptions 
FOR SELECT 
TO authenticated
USING (auth.uid() = subscriber_user_id AND auth.uid() IS NOT NULL);

-- Ensure channel owners can still view their subscribers (keep existing policy)
-- This policy already exists and is secure: "Channel owners can view their subscribers"

-- Add policy to prevent anonymous access to subscription data
CREATE POLICY "Block anonymous access to subscriptions" 
ON public.channel_subscriptions 
FOR SELECT 
TO anon
USING (false);

-- Update INSERT policy to be more restrictive - require authentication for email subscriptions
DROP POLICY IF EXISTS "Anyone can subscribe to public channels" ON public.channel_subscriptions;

CREATE POLICY "Authenticated users can subscribe to public channels" 
ON public.channel_subscriptions 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM channels 
    WHERE channels.id = channel_subscriptions.channel_id 
    AND channels.is_public = true
  )
  AND (
    -- Either user is setting their own user_id
    (auth.uid() = subscriber_user_id AND subscriber_email IS NULL)
    OR 
    -- Or user is subscribing with their authenticated email
    (subscriber_email = auth.email() AND subscriber_user_id IS NULL)
  )
);

-- Allow anonymous email subscriptions only (for newsletter-style subscriptions)
CREATE POLICY "Anonymous email subscriptions allowed" 
ON public.channel_subscriptions 
FOR INSERT 
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM channels 
    WHERE channels.id = channel_subscriptions.channel_id 
    AND channels.is_public = true
  )
  AND subscriber_user_id IS NULL 
  AND subscriber_email IS NOT NULL
);