import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { SmilesStructure } from "@/components/site/SmilesStructure";

export const Route = createFileRoute("/compounds/$id")({
  head: () => ({ meta: [{ title: "Compound — FarmacoPlants" }] }),
  component: CompoundDetail,
});

function CompoundDetail() {
  const { id } = Route.useParams();
  const { data: c, isLoading } = useQuery({
    queryKey: ["compound", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("compounds").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });
  const { data: plants } = useQuery({
    queryKey: ["compound-plants", id],
    queryFn: async () => {
      const { data } = await supabase.from("plant_compounds").select("plant_part,concentration,plants(id,scientific_name,family)").eq("compound_id", id);
      return data ?? [];
    },
  });
  const { data: acts } = useQuery({
    queryKey: ["compound-acts", id],
    queryFn: async () => {
      const { data } = await supabase.from("compound_activities").select("potency,assay,pharmacological_activities(id,name,category)").eq("compound_id", id);
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-6xl px-6 py-10 w-full">
        {isLoading || !c ? <p className="text-muted-foreground">Loading…</p> : (
          <>
            <div className="text-xs text-muted-foreground"><Link to="/compounds" className="hover:underline">Compounds</Link> / {c.name}</div>
            <h1 className="font-display text-4xl font-semibold mt-2">{c.name}</h1>
            {c.iupac_name && <p className="text-muted-foreground mt-1 italic">{c.iupac_name}</p>}

            <div className="grid md:grid-cols-[320px_1fr] gap-8 mt-8">
              <div className="rounded-lg border border-border bg-card p-4 grid place-items-center">
                {c.smiles ? <SmilesStructure smiles={c.smiles} width={300} height={260} /> : <span className="text-xs text-muted-foreground">no structure</span>}
              </div>

              <div className="space-y-4">
                <Field label="SMILES" mono value={c.smiles} />
                <Field label="InChI" mono value={c.inchi} />
                <Field label="InChI Key" mono value={c.inchi_key} />
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Molecular Formula" mono value={c.molecular_formula} />
                  <Field label="Molecular Weight" value={c.molecular_weight ? `${Number(c.molecular_weight).toFixed(3)} g/mol` : null} />
                  <Field label="Class" value={c.compound_class} />
                </div>
                {c.description && <Field label="Description" value={c.description} />}
              </div>
            </div>

            <Section title="Source plants">
              {!plants?.length ? <Empty>No plant sources linked yet.</Empty> : (
                <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                  {plants.map((p: any, i) => (
                    <li key={i} className="p-4 flex justify-between gap-4">
                      <div>
                        <Link to="/plants/$id" params={{ id: p.plants.id }} className="font-medium italic hover:text-primary">{p.plants.scientific_name}</Link>
                        <div className="text-xs text-muted-foreground">{p.plants.family}{p.plant_part ? ` · ${p.plant_part}` : ""}</div>
                      </div>
                      {p.concentration && <div className="text-sm text-muted-foreground">{p.concentration}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Pharmacological activities">
              {!acts?.length ? <Empty>No activities reported yet.</Empty> : (
                <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                  {acts.map((a: any, i) => (
                    <li key={i} className="p-4">
                      <Link to="/activities/$id" params={{ id: a.pharmacological_activities.id }} className="font-medium hover:text-primary">{a.pharmacological_activities.name}</Link>
                      <div className="text-xs text-muted-foreground">{a.pharmacological_activities.category}{a.potency ? ` · ${a.potency}` : ""}{a.assay ? ` · ${a.assay}` : ""}</div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value?: string | number | null; mono?: boolean }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{label}</div>
      <div className={"mt-1 text-sm text-foreground break-all " + (mono ? "font-mono" : "")}>{String(value)}</div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-10"><h2 className="font-display text-2xl font-semibold mb-3">{title}</h2>{children}</section>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-6 text-center">{children}</div>;
}
