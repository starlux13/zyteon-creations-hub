-- 1. Restrict role visibility
DROP POLICY IF EXISTS user_roles_read ON public.user_roles;
CREATE POLICY user_roles_read_own ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin_manager'::public.app_role));

-- 2. Lock down trigger-only SECURITY DEFINER function
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 3. Storage write ownership checks
DROP POLICY IF EXISTS site_media_team_insert ON storage.objects;
DROP POLICY IF EXISTS site_media_team_update ON storage.objects;
DROP POLICY IF EXISTS site_media_team_delete ON storage.objects;

CREATE POLICY site_media_team_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-media' AND owner = auth.uid());

CREATE POLICY site_media_team_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'site-media' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin_manager'::public.app_role)))
  WITH CHECK (bucket_id = 'site-media' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin_manager'::public.app_role)));

CREATE POLICY site_media_team_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'site-media' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin_manager'::public.app_role)));