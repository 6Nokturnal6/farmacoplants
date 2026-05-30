import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { SearchBar } from "@/components/site/SearchBar";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

export const Route = createFileRoute("/citations/")({
  validateSearch: z.object({ q: z.string().optional() }),
  head: () => ({ meta: [{ title: "Citations — FarmacoPlants" }] }),
  component: Citations,
});

function Citations() {
  const { q } = Route.useSearch();
  const { data, isLoading } = useQuery({
    queryKey: ["citations", q],
    queryFn: async () => {
      let query = supabase.from("citations").select("id,title,authors,journal,year,doi,url").order("year", { ascending: false }).limit(80);
      if (q) query = query.or(`title.ilike.%${q}%,authors.ilike.%${q}%,journal.ilike.%${q}%,doi.eq.${q}`);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-5xl px-6 py-10 w-full">
        <h1 className="font-display text-4xl font-semibold">Citations</h1>
        <div className="mt-6 max-w-2xl"><SearchBar scope="citations" placeholder="Title, author, journal, or DOI…" /></div>
        <div className="mt-8 space-y-3">
          {isLoading ? <p className="text-muted-foreground">Loading…</p> : data?.map((c) => (
            <article key={c.id} className="rounded-lg border border-border bg-card p-5">
              <h3 className="font-medium text-foreground">{c.title}</h3>
              <div className="text-sm text-muted-foreground mt-1">{c.authors}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {c.journal} {c.year && `· ${c.year}`}
                {c.doi && <> · <a href={`https://doi.org/${c.doi}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">doi:{c.doi}</a></>}
                {c.url && !c.doi && <> · <a href={c.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">link</a></>}
              </div>
            </article>
          ))}
          {!isLoading && !data?.length && <p className="text-muted-foreground">No citations yet.</p>}
        </div>
      </main>
      <Footer />
    </div>
  );
}
