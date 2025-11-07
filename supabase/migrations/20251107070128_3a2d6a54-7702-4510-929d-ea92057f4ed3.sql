-- Fix subscriber_access_audit to allow null accessed_subscriber_id
-- This is needed for operations that access all subscribers (like admin list view)

ALTER TABLE subscriber_access_audit 
ALTER COLUMN accessed_subscriber_id DROP NOT NULL;

COMMENT ON COLUMN subscriber_access_audit.accessed_subscriber_id IS 
'The subscriber being accessed. NULL means multiple/all subscribers were accessed (e.g., admin list view).';