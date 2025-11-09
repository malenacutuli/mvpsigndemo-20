-- Fix SECURITY DEFINER View Issue
-- Change mask_stripe_customer_id from SECURITY DEFINER to SECURITY INVOKER
-- This function only performs data transformation and doesn't need elevated privileges

-- Recreate the mask_stripe_customer_id function as SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.mask_stripe_customer_id(customer_id TEXT)
RETURNS TEXT AS $$
BEGIN
  IF customer_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Return only masked format, never expose real Stripe customer ID
  RETURN 'cus_' || substring(encode(sha256(customer_id::bytea), 'hex') from 1 for 12) || '***';
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

-- Add comment explaining the security model
COMMENT ON FUNCTION public.mask_stripe_customer_id(TEXT) IS 
'Masks Stripe customer IDs for display. Uses SECURITY INVOKER to respect RLS policies on the subscribers table.';