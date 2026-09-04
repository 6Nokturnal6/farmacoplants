CREATE OR REPLACE FUNCTION public.has_catalog_write_role(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  caller uuid := auth.uid();
BEGIN
  IF caller IS NULL OR _user_id <> caller THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'curator')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_catalog_write_role(uuid) TO authenticated;

-- plants: admin+curator insert/update, admin-only delete
DROP POLICY IF EXISTS plants_admin_insert ON public.plants;
DROP POLICY IF EXISTS plants_admin_update ON public.plants;
CREATE POLICY plants_curator_insert ON public.plants FOR INSERT TO authenticated WITH CHECK (public.has_catalog_write_role(auth.uid()));
CREATE POLICY plants_curator_update ON public.plants FOR UPDATE TO authenticated USING (public.has_catalog_write_role(auth.uid()));

-- compounds
DROP POLICY IF EXISTS compounds_admin_insert ON public.compounds;
DROP POLICY IF EXISTS compounds_admin_update ON public.compounds;
CREATE POLICY compounds_curator_insert ON public.compounds FOR INSERT TO authenticated WITH CHECK (public.has_catalog_write_role(auth.uid()));
CREATE POLICY compounds_curator_update ON public.compounds FOR UPDATE TO authenticated USING (public.has_catalog_write_role(auth.uid()));

-- pharmacological_activities
DROP POLICY IF EXISTS activities_admin_insert ON public.pharmacological_activities;
DROP POLICY IF EXISTS activities_admin_update ON public.pharmacological_activities;
CREATE POLICY activities_curator_insert ON public.pharmacological_activities FOR INSERT TO authenticated WITH CHECK (public.has_catalog_write_role(auth.uid()));
CREATE POLICY activities_curator_update ON public.pharmacological_activities FOR UPDATE TO authenticated USING (public.has_catalog_write_role(auth.uid()));

-- citations
DROP POLICY IF EXISTS citations_admin_insert ON public.citations;
DROP POLICY IF EXISTS citations_admin_update ON public.citations;
CREATE POLICY citations_curator_insert ON public.citations FOR INSERT TO authenticated WITH CHECK (public.has_catalog_write_role(auth.uid()));
CREATE POLICY citations_curator_update ON public.citations FOR UPDATE TO authenticated USING (public.has_catalog_write_role(auth.uid()));

-- link tables (ALL policies): recreate as curator read + admin/curator write
DROP POLICY IF EXISTS pc_admin_write ON public.plant_compounds;
CREATE POLICY pc_curator_write ON public.plant_compounds FOR ALL TO authenticated USING (public.has_catalog_write_role(auth.uid())) WITH CHECK (public.has_catalog_write_role(auth.uid()));

DROP POLICY IF EXISTS pa_admin_write ON public.plant_activities;
CREATE POLICY pa_curator_write ON public.plant_activities FOR ALL TO authenticated USING (public.has_catalog_write_role(auth.uid())) WITH CHECK (public.has_catalog_write_role(auth.uid()));

DROP POLICY IF EXISTS ca_admin_write ON public.compound_activities;
CREATE POLICY ca_curator_write ON public.compound_activities FOR ALL TO authenticated USING (public.has_catalog_write_role(auth.uid())) WITH CHECK (public.has_catalog_write_role(auth.uid()));

DROP POLICY IF EXISTS ec_admin_write ON public.entity_citations;
CREATE POLICY ec_curator_write ON public.entity_citations FOR ALL TO authenticated USING (public.has_catalog_write_role(auth.uid())) WITH CHECK (public.has_catalog_write_role(auth.uid()));