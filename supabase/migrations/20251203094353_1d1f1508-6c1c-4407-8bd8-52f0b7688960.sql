CREATE OR REPLACE FUNCTION public.enhanced_subscription_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Log all access to subscription data with detailed information
  INSERT INTO subscriber_access_audit (
    user_id,
    accessed_subscriber_id,
    access_type,
    accessed_fields,
    ip_address,
    user_agent
  ) VALUES (
    COALESCE(auth.uid(), NULL),
    COALESCE(NEW.user_id, OLD.user_id),
    -- FIX: Map PostgreSQL TG_OP values to allowed access_type values
    CASE TG_OP
      WHEN 'INSERT' THEN 'create'
      WHEN 'UPDATE' THEN 'update'
      WHEN 'DELETE' THEN 'delete'
      ELSE 'read'
    END,
    CASE 
      WHEN TG_OP = 'SELECT' THEN ARRAY['subscription_data_accessed']
      WHEN TG_OP = 'INSERT' THEN ARRAY['subscription_created'] 
      WHEN TG_OP = 'UPDATE' THEN ARRAY['subscription_modified']
      WHEN TG_OP = 'DELETE' THEN ARRAY['subscription_deleted']
    END,
    public.anonymize_ip_address(inet_client_addr()),
    left(current_setting('request.headers', true)::json->>'user-agent', 100)
  );
  
  -- Check for suspicious activity patterns
  PERFORM public.detect_suspicious_subscription_access(COALESCE(auth.uid(), NULL));
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;