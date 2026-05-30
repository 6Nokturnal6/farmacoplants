import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { SearchBar } from "@/components/site/SearchBar";
import { supabase } from "@/integrations/supabase/client";
import { SmilesStructure } from "@/components/site/SmilesStructure";
import { z } from "zod";

const searchSchema = z.object({ q: z.string().optional() });

export const Route = createFileRoute("/compounds/")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Compounds — FarmacoPlants" }, { name: "description", content: "Browse and search chemical compounds isolated from medicinal plants." }] }),
  component: CompoundsList,
});

function CompoundsList() {
  const { q } = Route.useSearch();
  const { data, isLoading } = useQuery({
    queryKey: ["compounds", q],
    queryFn: async () => {
      let query = supabase.from("compounds").select("id,name,smiles,molecular_formula,molecular_weight,compound_class").order("name").limit(60);
      if (q) query = query.or(`name.ilike.%${q}%,iupac_name.ilike.%${q}%,smiles.eq.${q},inchi_key.eq.${q}`);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-7xl px-6 py-10 w-full">
        <h1 className="font-display text-4xl font-semibold">Compounds</h1>
        <p className="text-muted-foreground mt-2">Chemical constituents isolated from plants in the collection.</p>
        <div className="mt-6 max-w-2xl"><SearchBar scope="compounds" placeholder="Compound name, IUPAC, or SMILES…" /></div>

        <div className="mt-8">
          {isLoading ? <p className="text-muted-foreground">Loading…</p> : !data?.length ? (
            <p className="text-muted-foreground">No compounds {q ? `match "${q}"` : "yet"}.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.map((c) => (
                <Link key={c.id} to="/compounds/$id" params={{ id: c.id }} className="group rounded-lg border border-border bg-card p-4 hover:border-primary/50 hover:shadow-sm transition-all">
                  <div className="h-32 grid place-items-center bg-secondary/40 rounded">
                    {c.smiles ? <SmilesStructure smiles={c.smiles} width={220} height={120} /> : <span className="text-xs text-muted-foreground">no structure</span>}
                  </div>
                  <div className="mt-3">
                    <div className="font-medium text-foreground line-clamp-1 group-hover:text-primary">{c.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex gap-2">
                      {c.molecular_formula && <span className="font-mono">{c.molecular_formula}</span>}
                      {c.molecular_weight && <span>· {Number(c.molecular_weight).toFixed(2)} g/mol</span>}
                    </div>
                    {c.compound_class && <div className="text-xs text-primary/80 mt-1">{c.compound_class}</div>}
                  </div>
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
