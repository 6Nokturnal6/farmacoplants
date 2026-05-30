
-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin', 'curator', 'user');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_profile_select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own_profile_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Auto-create profile + assign 'user' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_view_own_roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ UPDATED_AT TRIGGER ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============ PLANTS ============
CREATE TABLE public.plants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scientific_name TEXT NOT NULL,
  family TEXT,
  genus TEXT,
  common_names TEXT[],
  local_names TEXT[],
  geographic_origin TEXT,
  habitat TEXT,
  plant_parts TEXT[],
  description TEXT,
  image_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scientific_name)
);
CREATE INDEX plants_scientific_name_idx ON public.plants USING gin (to_tsvector('simple', scientific_name));
CREATE INDEX plants_family_idx ON public.plants (family);
GRANT SELECT ON public.plants TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.plants TO authenticated;
GRANT ALL ON public.plants TO service_role;
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plants_public_read" ON public.plants FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "plants_admin_insert" ON public.plants FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "plants_admin_update" ON public.plants FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "plants_admin_delete" ON public.plants FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER plants_updated_at BEFORE UPDATE ON public.plants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ COMPOUNDS ============
CREATE TABLE public.compounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  iupac_name TEXT,
  smiles TEXT,
  inchi TEXT,
  inchi_key TEXT,
  molecular_formula TEXT,
  molecular_weight NUMERIC,
  compound_class TEXT,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX compounds_name_idx ON public.compounds USING gin (to_tsvector('simple', name));
CREATE INDEX compounds_smiles_idx ON public.compounds (smiles);
CREATE INDEX compounds_inchi_key_idx ON public.compounds (inchi_key);
CREATE INDEX compounds_class_idx ON public.compounds (compound_class);
GRANT SELECT ON public.compounds TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.compounds TO authenticated;
GRANT ALL ON public.compounds TO service_role;
ALTER TABLE public.compounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "compounds_public_read" ON public.compounds FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "compounds_admin_insert" ON public.compounds FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "compounds_admin_update" ON public.compounds FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "compounds_admin_delete" ON public.compounds FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER compounds_updated_at BEFORE UPDATE ON public.compounds FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PHARMACOLOGICAL ACTIVITIES ============
CREATE TABLE public.pharmacological_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  mechanism TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name)
);
CREATE INDEX activities_name_idx ON public.pharmacological_activities USING gin (to_tsvector('simple', name));
GRANT SELECT ON public.pharmacological_activities TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pharmacological_activities TO authenticated;
GRANT ALL ON public.pharmacological_activities TO service_role;
ALTER TABLE public.pharmacological_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activities_public_read" ON public.pharmacological_activities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "activities_admin_insert" ON public.pharmacological_activities FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "activities_admin_update" ON public.pharmacological_activities FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "activities_admin_delete" ON public.pharmacological_activities FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER activities_updated_at BEFORE UPDATE ON public.pharmacological_activities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ CITATIONS ============
CREATE TABLE public.citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doi TEXT,
  title TEXT NOT NULL,
  authors TEXT,
  journal TEXT,
  year INTEGER,
  url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (doi)
);
CREATE INDEX citations_title_idx ON public.citations USING gin (to_tsvector('simple', title));
CREATE INDEX citations_year_idx ON public.citations (year);
GRANT SELECT ON public.citations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.citations TO authenticated;
GRANT ALL ON public.citations TO service_role;
ALTER TABLE public.citations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "citations_public_read" ON public.citations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "citations_admin_insert" ON public.citations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "citations_admin_update" ON public.citations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "citations_admin_delete" ON public.citations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER citations_updated_at BEFORE UPDATE ON public.citations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ JUNCTION: plant_compounds ============
CREATE TABLE public.plant_compounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  compound_id UUID NOT NULL REFERENCES public.compounds(id) ON DELETE CASCADE,
  plant_part TEXT,
  concentration TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plant_id, compound_id, plant_part)
);
GRANT SELECT ON public.plant_compounds TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.plant_compounds TO authenticated;
GRANT ALL ON public.plant_compounds TO service_role;
ALTER TABLE public.plant_compounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pc_public_read" ON public.plant_compounds FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "pc_admin_write" ON public.plant_compounds FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ JUNCTION: compound_activities ============
CREATE TABLE public.compound_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compound_id UUID NOT NULL REFERENCES public.compounds(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.pharmacological_activities(id) ON DELETE CASCADE,
  potency TEXT,
  assay TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (compound_id, activity_id)
);
GRANT SELECT ON public.compound_activities TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.compound_activities TO authenticated;
GRANT ALL ON public.compound_activities TO service_role;
ALTER TABLE public.compound_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ca_public_read" ON public.compound_activities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "ca_admin_write" ON public.compound_activities FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ JUNCTION: plant_activities ============
CREATE TABLE public.plant_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.pharmacological_activities(id) ON DELETE CASCADE,
  traditional_use BOOLEAN DEFAULT false,
  plant_part TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (plant_id, activity_id, plant_part)
);
GRANT SELECT ON public.plant_activities TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.plant_activities TO authenticated;
GRANT ALL ON public.plant_activities TO service_role;
ALTER TABLE public.plant_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pa_public_read" ON public.plant_activities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "pa_admin_write" ON public.plant_activities FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ JUNCTION: entity_citations (polymorphic) ============
CREATE TYPE public.entity_kind AS ENUM ('plant', 'compound', 'activity');

CREATE TABLE public.entity_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_kind entity_kind NOT NULL,
  entity_id UUID NOT NULL,
  citation_id UUID NOT NULL REFERENCES public.citations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_kind, entity_id, citation_id)
);
CREATE INDEX entity_citations_entity_idx ON public.entity_citations (entity_kind, entity_id);
GRANT SELECT ON public.entity_citations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.entity_citations TO authenticated;
GRANT ALL ON public.entity_citations TO service_role;
ALTER TABLE public.entity_citations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ec_public_read" ON public.entity_citations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "ec_admin_write" ON public.entity_citations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
