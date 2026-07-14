
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL CHECK (action IN ('insert','update','delete')),
  table_name text NOT NULL,
  row_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON public.admin_audit_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log (created_at DESC);
CREATE INDEX idx_admin_audit_log_table_name ON public.admin_audit_log (table_name);
CREATE INDEX idx_admin_audit_log_actor_id ON public.admin_audit_log (actor_id);

CREATE OR REPLACE FUNCTION public.log_admin_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_email text;
  v_row_id text;
  v_action text;
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'insert'; v_new := to_jsonb(NEW); v_old := NULL;
    v_row_id := COALESCE(v_new->>'id', '');
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update'; v_new := to_jsonb(NEW); v_old := to_jsonb(OLD);
    v_row_id := COALESCE(v_new->>'id', '');
  ELSE
    v_action := 'delete'; v_old := to_jsonb(OLD); v_new := NULL;
    v_row_id := COALESCE(v_old->>'id', '');
  END IF;

  IF v_actor IS NOT NULL THEN
    SELECT email INTO v_email FROM auth.users WHERE id = v_actor;
  END IF;

  INSERT INTO public.admin_audit_log
    (actor_id, actor_email, action, table_name, row_id, old_data, new_data)
  VALUES
    (v_actor, v_email, v_action, TG_TABLE_NAME, NULLIF(v_row_id, ''), v_old, v_new);

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_admin_action() FROM PUBLIC;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'plants','compounds','pharmacological_activities','citations',
    'entity_citations','plant_compounds','plant_activities','compound_activities',
    'user_roles'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'CREATE TRIGGER audit_%1$s
         AFTER INSERT OR UPDATE OR DELETE ON public.%1$I
         FOR EACH ROW EXECUTE FUNCTION public.log_admin_action()',
      t
    );
  END LOOP;
END $$;
