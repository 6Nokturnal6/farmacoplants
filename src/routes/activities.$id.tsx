import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/activities/$id")({
  head: () => ({ meta: [{ title: "Activity — FarmacoPlants" }] }),
  component: ActivityDetail,
});

function ActivityDetail() {
  const { id } = Route.useParams();
  const { data: a, isLoading } = useQuery({
    queryKey: ["activity", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("pharmacological_activities").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });
  const { data: compounds } = useQuery({
    queryKey: ["activity-compounds", id],
    queryFn: async () => {
      const { data } = await supabase.from("compound_activities").select("potency,assay,compounds(id,name,molecular_formula)").eq("activity_id", id);
      return data ?? [];
    },
  });
  const { data: plants } = useQuery({
    queryKey: ["activity-plants", id],
    queryFn: async () => {
      const { data } = await supabase.from("plant_activities").select("traditional_use,plant_part,plants(id,scientific_name,family)").eq("activity_id", id);
      return data ?? [];
    },
  });
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-5xl px-6 py-10 w-full">
        {isLoading || !a ? <p>Loading…</p> : (
          <>
            <div className="text-xs text-muted-foreground"><Link to="/activities" className="hover:underline">Activities</Link> / {a.name}</div>
            <h1 className="font-display text-4xl font-semibold mt-2">{a.name}</h1>
            {a.category && <div className="text-sm text-primary mt-1">{a.category}</div>}
            {a.description && <p className="mt-4 text-muted-foreground leading-relaxed">{a.description}</p>}
            {a.mechanism && <div className="mt-4"><div className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Mechanism</div><p className="text-sm mt-1">{a.mechanism}</p></div>}

            <section className="mt-10">
              <h2 className="font-display text-2xl font-semibold mb-3">Associated compounds</h2>
              {!compounds?.length ? <p className="text-sm text-muted-foreground">None linked.</p> : (
                <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                  {compounds.map((c: any, i) => (
                    <li key={i} className="p-4 flex justify-between">
                      <div>
                        <Link to="/compounds/$id" params={{ id: c.compounds.id }} className="font-medium hover:text-primary">{c.compounds.name}</Link>
                        <div className="text-xs text-muted-foreground font-mono">{c.compounds.molecular_formula}</div>
                      </div>
                      <div className="text-xs text-muted-foreground text-right">{c.potency}<br />{c.assay}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="mt-10">
              <h2 className="font-display text-2xl font-semibold mb-3">Associated plants</h2>
              {!plants?.length ? <p className="text-sm text-muted-foreground">None linked.</p> : (
                <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                  {plants.map((p: any, i) => (
                    <li key={i} className="p-4">
                      <Link to="/plants/$id" params={{ id: p.plants.id }} className="font-medium italic hover:text-primary">{p.plants.scientific_name}</Link>
                      <div className="text-xs text-muted-foreground">{p.plants.family}{p.plant_part ? ` · ${p.plant_part}` : ""}{p.traditional_use ? " · traditional use" : ""}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
