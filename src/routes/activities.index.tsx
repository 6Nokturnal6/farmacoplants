import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { SearchBar } from "@/components/site/SearchBar";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

export const Route = createFileRoute("/activities/")({
  validateSearch: z.object({ q: z.string().optional() }),
  head: () => ({ meta: [{ title: "Pharmacological Activities — FarmacoPlants" }] }),
  component: Activities,
});

function Activities() {
  const { q } = Route.useSearch();
  const { data, isLoading } = useQuery({
    queryKey: ["activities", q],
    queryFn: async () => {
      let query = supabase.from("pharmacological_activities").select("id,name,category,description").order("name").limit(80);
      if (q) query = query.or(`name.ilike.%${q}%,category.ilike.%${q}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-7xl px-6 py-10 w-full">
        <h1 className="font-display text-4xl font-semibold">Pharmacological activities</h1>
        <div className="mt-6 max-w-2xl"><SearchBar scope="activities" placeholder="Activity or category…" /></div>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? <p className="text-muted-foreground">Loading…</p> : data?.map((a) => (
            <Link key={a.id} to="/activities/$id" params={{ id: a.id }} className="rounded-lg border border-border bg-card p-5 hover:border-primary/50 hover:shadow-sm transition-all">
              <div className="font-medium text-foreground">{a.name}</div>
              {a.category && <div className="text-xs text-primary/80 mt-1">{a.category}</div>}
              {a.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{a.description}</p>}
            </Link>
          ))}
          {!isLoading && !data?.length && <p className="text-muted-foreground">No activities yet.</p>}
        </div>
      </main>
      <Footer />
    </div>
  );
}
