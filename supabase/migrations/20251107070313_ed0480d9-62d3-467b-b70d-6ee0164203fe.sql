-- Update subscriber_access_audit constraint to include admin access types
-- This allows more granular audit logging for different admin operations

-- Drop the old constraint
ALTER TABLE subscriber_access_audit 
DROP CONSTRAINT IF EXISTS valid_access_type;

-- Create updated constraint with admin-specific access types
ALTER TABLE subscriber_access_audit
ADD CONSTRAINT valid_access_type CHECK (
  access_type IN (
    'read',
    'update', 
    'create',
    'delete',
    'admin_list_access',        -- Admin viewing all subscribers
    'admin_masked_access',       -- Admin viewing masked data
    'system_webhook_access',     -- System webhooks (Stripe, etc)
    'secure_read',              -- Secure function access
    'admin_stats_access'        -- Admin viewing statistics only
  )
);

COMMENT ON CONSTRAINT valid_access_type ON subscriber_access_audit IS 
'Ensures access_type uses standardized values for audit trail consistency';