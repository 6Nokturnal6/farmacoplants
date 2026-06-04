
CREATE POLICY "plant_images_read_all" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'plant-images');
CREATE POLICY "plant_images_admin_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'plant-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "plant_images_admin_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'plant-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "plant_images_admin_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'plant-images' AND public.has_role(auth.uid(), 'admin'));
