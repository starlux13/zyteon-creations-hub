CREATE POLICY "site_media_team_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'site-media');
CREATE POLICY "site_media_team_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'site-media');
CREATE POLICY "site_media_team_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'site-media');
CREATE POLICY "site_media_team_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'site-media');