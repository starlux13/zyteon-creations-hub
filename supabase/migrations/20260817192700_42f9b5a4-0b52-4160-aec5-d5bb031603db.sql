DROP VIEW IF EXISTS public.profiles_public;

-- Column-level grants: anon can only read public team fields, never email
GRANT SELECT (id, display_name, title, bio, avatar_url) ON public.profiles TO anon;

CREATE POLICY profiles_anon_public_read ON public.profiles
  FOR SELECT TO anon USING (true);