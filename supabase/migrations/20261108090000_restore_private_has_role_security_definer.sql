-- The role helper must bypass user_roles RLS to avoid recursive policy evaluation.
-- Keep an empty search_path and fully-qualified objects to prevent search_path hijacking.
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
