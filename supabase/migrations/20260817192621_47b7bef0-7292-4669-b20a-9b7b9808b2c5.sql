-- Public team info via restricted view, no anon access to base profiles table
REVOKE SELECT ON public.profiles FROM anon;

DROP POLICY IF EXISTS profiles_public_read ON public.profiles;

CREATE POLICY profiles_team_read ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = off) AS
  SELECT id, display_name, title, bio, avatar_url
  FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;