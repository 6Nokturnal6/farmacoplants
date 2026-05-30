import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { SearchBar } from "@/components/site/SearchBar";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

export const Route = createFileRoute("/plants/")({
  validateSearch: z.object({ q: z.string().optional() }),
  head: () => ({ meta: [{ title: "Plants — FarmacoPlants" }, { name: "description", content: "Browse medicinal plants in the collection." }] }),
  component: PlantsList,
});

function PlantsList() {
  const { q } = Route.useSearch();
  const { data, isLoading } = useQuery({
    queryKey: ["plants", q],
    queryFn: async () => {
      let query = supabase.from("plants").select("id,scientific_name,family,geographic_origin,common_names").order("scientific_name").limit(60);
      if (q) query = query.or(`scientific_name.ilike.%${q}%,family.ilike.%${q}%,genus.ilike.%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-7xl px-6 py-10 w-full">
        <h1 className="font-display text-4xl font-semibold">Plants</h1>
        <p className="text-muted-foreground mt-2">Medicinal plants studied in this collection.</p>
        <div className="mt-6 max-w-2xl"><SearchBar scope="plants" placeholder="Scientific name, family, or genus…" /></div>
        <div className="mt-8">
          {isLoading ? <p className="text-muted-foreground">Loading…</p> : !data?.length ? (
            <p className="text-muted-foreground">No plants {q ? `match "${q}"` : "yet"}.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.map((p) => (
                <Link key={p.id} to="/plants/$id" params={{ id: p.id }} className="rounded-lg border border-border bg-card p-5 hover:border-primary/50 hover:shadow-sm transition-all">
                  <div className="font-display text-lg italic text-foreground">{p.scientific_name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{p.family}{p.geographic_origin ? ` · ${p.geographic_origin}` : ""}</div>
                  {p.common_names && p.common_names.length > 0 && <div className="text-xs text-muted-foreground mt-2">{p.common_names.join(", ")}</div>}
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
