-- Server-side validation for relationship metadata fields.
-- Mirrors client validation in src/routes/admin.tsx so invalid values
-- are rejected even when written outside the app UI.

CREATE OR REPLACE FUNCTION public.validate_relation_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  allowed_parts text[] := ARRAY[
    'leaf','leaves','root','roots','bark','stem','stems',
    'flower','flowers','fruit','fruits','seed','seeds',
    'rhizome','tuber','bulb','latex','resin','wood',
    'whole plant','aerial parts','twig','twigs','sap','exudate','pericarp'
  ];
  sci_re text := '^[A-Za-z0-9.,%/<>=±≤≥μµ\s()\-+×x*·]+$';
  v_part text;
  v_conc text;
  v_pot  text;
  v_notes text;
BEGIN
  -- plant_part validation (plant_compounds, plant_activities)
  IF TG_TABLE_NAME IN ('plant_compounds','plant_activities') THEN
    v_part := NULLIF(btrim(NEW.plant_part), '');
    NEW.plant_part := v_part;
    IF v_part IS NOT NULL THEN
      IF length(v_part) > 60 THEN
        RAISE EXCEPTION 'plant_part too long (max 60 chars)';
      END IF;
      IF NOT (lower(v_part) = ANY(allowed_parts)) THEN
        RAISE EXCEPTION 'Invalid plant_part "%": not in controlled vocabulary', v_part;
      END IF;
    END IF;
  END IF;

  -- concentration (plant_compounds)
  IF TG_TABLE_NAME = 'plant_compounds' THEN
    v_conc := NULLIF(btrim(NEW.concentration), '');
    NEW.concentration := v_conc;
    IF v_conc IS NOT NULL THEN
      IF length(v_conc) > 100 THEN
        RAISE EXCEPTION 'concentration too long (max 100 chars)';
      END IF;
      IF v_conc !~ sci_re THEN
        RAISE EXCEPTION 'concentration contains invalid characters';
      END IF;
    END IF;
  END IF;

  -- potency (compound_activities)
  IF TG_TABLE_NAME = 'compound_activities' THEN
    v_pot := NULLIF(btrim(NEW.potency), '');
    NEW.potency := v_pot;
    IF v_pot IS NOT NULL THEN
      IF length(v_pot) > 100 THEN
        RAISE EXCEPTION 'potency too long (max 100 chars)';
      END IF;
      IF v_pot !~ sci_re THEN
        RAISE EXCEPTION 'potency contains invalid characters';
      END IF;
    END IF;
  END IF;

  -- notes (plant_compounds, plant_activities, compound_activities)
  IF TG_TABLE_NAME IN ('plant_compounds','plant_activities','compound_activities') THEN
    v_notes := NULLIF(btrim(NEW.notes), '');
    NEW.notes := v_notes;
    IF v_notes IS NOT NULL AND length(v_notes) > 500 THEN
      RAISE EXCEPTION 'notes too long (max 500 chars)';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_plant_compounds ON public.plant_compounds;
CREATE TRIGGER validate_plant_compounds
BEFORE INSERT OR UPDATE ON public.plant_compounds
FOR EACH ROW EXECUTE FUNCTION public.validate_relation_fields();

DROP TRIGGER IF EXISTS validate_compound_activities ON public.compound_activities;
CREATE TRIGGER validate_compound_activities
BEFORE INSERT OR UPDATE ON public.compound_activities
FOR EACH ROW EXECUTE FUNCTION public.validate_relation_fields();

DROP TRIGGER IF EXISTS validate_plant_activities ON public.plant_activities;
CREATE TRIGGER validate_plant_activities
BEFORE INSERT OR UPDATE ON public.plant_activities
FOR EACH ROW EXECUTE FUNCTION public.validate_relation_fields();