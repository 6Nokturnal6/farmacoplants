import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { PlantImage } from "@/lib/plant-image";
import { fetchPlantProfile, downloadPlantPdf, downloadPlantBibtex } from "@/lib/plant-export";
import { useState } from "react";
import { Download, FileText } from "lucide-react";

export const Route = createFileRoute("/plants/$id")({
  head: () => ({ meta: [{ title: "Plant — FarmacoPlants" }] }),
  component: PlantDetail,
});

function PlantDetail() {
  const { id } = Route.useParams();
  const { data: p, isLoading } = useQuery({
    queryKey: ["plant", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("plants").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });
  const { data: compounds } = useQuery({
    queryKey: ["plant-compounds", id],
    queryFn: async () => {
      const { data } = await supabase.from("plant_compounds").select("plant_part,concentration,compounds(id,name,molecular_formula,compound_class)").eq("plant_id", id);
      return data ?? [];
    },
  });
  const { data: acts } = useQuery({
    queryKey: ["plant-acts", id],
    queryFn: async () => {
      const { data } = await supabase.from("plant_activities").select("traditional_use,plant_part,notes,pharmacological_activities(id,name,category)").eq("plant_id", id);
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-6xl px-6 py-10 w-full">
        {isLoading || !p ? <p className="text-muted-foreground">Loading…</p> : (
          <>
            <div className="text-xs text-muted-foreground"><Link to="/plants" className="hover:underline">Plants</Link> / {p.scientific_name}</div>
            <h1 className="font-display text-4xl italic font-semibold mt-2">{p.scientific_name}</h1>
            <div className="mt-1 text-muted-foreground text-sm">{p.family}{p.genus ? ` · ${p.genus}` : ""}</div>
            <ExportButtons plantId={p.id} />

            <div className="grid md:grid-cols-2 gap-6 mt-8">
              {p.image_url && <PlantImage value={p.image_url} alt={p.scientific_name} className="w-full rounded-lg border border-border bg-card" />}
              <div className="space-y-4">
                {p.common_names?.length ? <Field label="Common names" value={p.common_names.join(", ")} /> : null}
                {p.local_names?.length ? <Field label="Local names" value={p.local_names.join(", ")} /> : null}
                {p.geographic_origin && <Field label="Geographic origin" value={p.geographic_origin} />}
                {p.habitat && <Field label="Habitat" value={p.habitat} />}
                {p.plant_parts?.length ? <Field label="Parts studied" value={p.plant_parts.join(", ")} /> : null}
                {p.description && <Field label="Description" value={p.description} />}
              </div>
            </div>

            <Section title="Constituents">
              {!compounds?.length ? <Empty>No compounds linked yet.</Empty> : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {compounds.map((c: any, i) => (
                    <Link key={i} to="/compounds/$id" params={{ id: c.compounds.id }} className="rounded-lg border border-border bg-card p-3 hover:border-primary/50">
                      <div className="font-medium">{c.compounds.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{c.compounds.molecular_formula}</div>
                      {(c.plant_part || c.concentration) && <div className="text-xs text-muted-foreground mt-1">{c.plant_part}{c.concentration ? ` · ${c.concentration}` : ""}</div>}
                    </Link>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Reported activities">
              {!acts?.length ? <Empty>No activities reported yet.</Empty> : (
                <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                  {acts.map((a: any, i) => (
                    <li key={i} className="p-4">
                      <div className="flex justify-between items-center">
                        <Link to="/activities/$id" params={{ id: a.pharmacological_activities.id }} className="font-medium hover:text-primary">{a.pharmacological_activities.name}</Link>
                        {a.traditional_use && <span className="text-xs bg-accent/30 text-accent-foreground px-2 py-0.5 rounded-full">traditional use</span>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{a.pharmacological_activities.category}{a.plant_part ? ` · ${a.plant_part}` : ""}</div>
                      {a.notes && <p className="text-sm text-muted-foreground mt-2">{a.notes}</p>}
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

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return <div><div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{label}</div><div className="mt-1 text-sm">{value}</div></div>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-10"><h2 className="font-display text-2xl font-semibold mb-3">{title}</h2>{children}</section>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-6 text-center">{children}</div>;
}
