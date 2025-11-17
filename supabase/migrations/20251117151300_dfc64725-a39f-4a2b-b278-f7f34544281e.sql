-- Grant admin role to malena@axessible.ai
-- First, get the user_id for malena@axessible.ai
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Find user by email
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'malena@axessible.ai';
  
  -- If user exists, grant admin role
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, granted_by)
    VALUES (admin_user_id, 'admin', admin_user_id)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Admin role granted to malena@axessible.ai';
  ELSE
    RAISE NOTICE 'User malena@axessible.ai not found';
  END IF;
END $$;

-- Verify the role was added
SELECT 
  u.email,
  ur.role,
  ur.granted_at
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email = 'malena@axessible.ai';
