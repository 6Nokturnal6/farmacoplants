import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { SearchBar } from "@/components/site/SearchBar";
import { supabase } from "@/integrations/supabase/client";
import { Leaf, FlaskConical, Activity } from "lucide-react";

const searchSchema = z.object({
  q: z.string().optional(),
  kind: z.enum(["all", "plants", "compounds", "activities"]).optional().default("all"),
  category: z.string().optional(),
});

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Search — FarmacoPlants" },
      { name: "description", content: "Search across plants, chemical compounds, and pharmacological activities." },
    ],
  }),
  errorComponent: ({ error }) => (
    <div className="p-10 text-sm text-destructive">Search failed: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-10">Not found.</div>,
  component: SearchPage,
});

// Escape characters that break PostgREST `.or()` filter syntax.
function safeQ(q: string): string {
  return q.replace(/[(),*]/g, " ").trim();
}

const KINDS = [
  { id: "all", label: "All" },
  { id: "plants", label: "Plants" },
  { id: "compounds", label: "Compounds" },
  { id: "activities", label: "Activities" },
] as const;

function SearchPage() {
  const { q, kind, category } = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const term = q ? safeQ(q) : "";
  const wildcard = term ? `%${term}%` : null;

  // PLANTS
  const plants = useQuery({
    enabled: (kind === "all" || kind === "plants") && !!wildcard,
    queryKey: ["search", "plants", wildcard],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plants")
        .select("id,scientific_name,family,genus,common_names,geographic_origin")
        .or(
          `scientific_name.ilike.${wildcard},family.ilike.${wildcard},genus.ilike.${wildcard},geographic_origin.ilike.${wildcard}`,
        )
        .order("scientific_name")
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  // COMPOUNDS — name, IUPAC, formula, class, SMILES substring
  const compounds = useQuery({
    enabled: (kind === "all" || kind === "compounds") && !!wildcard,
    queryKey: ["search", "compounds", wildcard],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compounds")
        .select("id,name,iupac_name,smiles,molecular_formula,compound_class")
        .or(
          `name.ilike.${wildcard},iupac_name.ilike.${wildcard},smiles.ilike.${wildcard},molecular_formula.ilike.${wildcard},compound_class.ilike.${wildcard}`,
        )
        .order("name")
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  // ACTIVITIES — name, category, mechanism. Optionally filter by category.
  const activities = useQuery({
    enabled: (kind === "all" || kind === "activities") && (!!wildcard || !!category),
    queryKey: ["search", "activities", wildcard, category ?? null],
    queryFn: async () => {
      let query = supabase
        .from("pharmacological_activities")
        .select("id,name,category,mechanism")
        .order("name")
        .limit(50);
      if (wildcard) {
        query = query.or(`name.ilike.${wildcard},category.ilike.${wildcard},mechanism.ilike.${wildcard}`);
      }
      if (category) query = query.eq("category", category);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  // Distinct categories for filter dropdown.
  const categories = useQuery({
    queryKey: ["activity-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pharmacological_activities")
        .select("category")
        .not("category", "is", null)
        .limit(1000);
      const set = new Set<string>();
      for (const r of data ?? []) if (r.category) set.add(r.category);
      return [...set].sort();
    },
  });

  const setKind = (k: (typeof KINDS)[number]["id"]) =>
    navigate({ search: (prev) => ({ ...prev, kind: k }) });
  const setCategory = (c: string | undefined) =>
    navigate({ search: (prev) => ({ ...prev, category: c || undefined }) });

  const counts = {
    plants: plants.data?.length ?? 0,
    compounds: compounds.data?.length ?? 0,
    activities: activities.data?.length ?? 0,
  };
  const total = counts.plants + counts.compounds + counts.activities;
  const loading = plants.isFetching || compounds.isFetching || activities.isFetching;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-7xl px-6 py-10 w-full">
        <h1 className="font-display text-4xl font-semibold">Search</h1>
        <p className="text-muted-foreground mt-2">
          Across plants (name, family, genus, origin), compounds (name, IUPAC, SMILES, formula, class) and activities (name, category, mechanism).
        </p>

        <div className="mt-6 max-w-3xl">
          <SearchBar scope="all" placeholder="Search plants, compounds, activities, SMILES…" />
        </div>

        {/* FILTERS */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKind(k.id)}
              className={
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors " +
                (kind === k.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border hover:border-primary/50 text-foreground")
              }
            >
              {k.label}
            </button>
          ))}
          {(kind === "all" || kind === "activities") && (
            <select
              value={category ?? ""}
              onChange={(e) => setCategory(e.target.value)}
              className="ml-2 text-xs px-3 py-1.5 rounded-full bg-card border border-border focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All activity categories</option>
              {(categories.data ?? []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>

        {/* RESULTS */}
        <div className="mt-8 space-y-10">
          {!term && !category && (
            <p className="text-muted-foreground text-sm">Type a query to begin. Try <em>quercetin</em>, <em>Catharanthus</em>, <em>C8H10N4O2</em>, or a SMILES fragment like <em>C(=O)O</em>.</p>
          )}

          {(term || category) && (
            <div className="text-xs text-muted-foreground">
              {loading ? "Searching…" : `${total} result${total === 1 ? "" : "s"} for "${term || category}"`}
            </div>
          )}

          {(kind === "all" || kind === "plants") && (plants.data?.length ?? 0) > 0 && (
            <ResultGroup title="Plants" icon={<Leaf className="h-4 w-4" />} count={counts.plants} viewAllTo="/plants" viewAllSearch={{ q: term }}>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {plants.data!.map((p) => (
                  <Link key={p.id} to="/plants/$id" params={{ id: p.id }} className="rounded-md border border-border bg-card p-4 hover:border-primary/50 transition-colors">
                    <div className="font-display italic text-foreground">{p.scientific_name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {[p.family, p.geographic_origin].filter(Boolean).join(" · ")}
                    </div>
                    {p.common_names && p.common_names.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1 truncate">{p.common_names.join(", ")}</div>
                    )}
                  </Link>
                ))}
              </div>
            </ResultGroup>
          )}

          {(kind === "all" || kind === "compounds") && (compounds.data?.length ?? 0) > 0 && (
            <ResultGroup title="Compounds" icon={<FlaskConical className="h-4 w-4" />} count={counts.compounds} viewAllTo="/compounds" viewAllSearch={{ q: term }}>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {compounds.data!.map((c) => (
                  <Link key={c.id} to="/compounds/$id" params={{ id: c.id }} className="rounded-md border border-border bg-card p-4 hover:border-primary/50 transition-colors">
                    <div className="font-medium text-foreground truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {[c.compound_class, c.molecular_formula].filter(Boolean).join(" · ")}
                    </div>
                    {c.smiles && <div className="font-mono text-[11px] text-muted-foreground mt-1 truncate">{c.smiles}</div>}
                  </Link>
                ))}
              </div>
            </ResultGroup>
          )}

          {(kind === "all" || kind === "activities") && (activities.data?.length ?? 0) > 0 && (
            <ResultGroup title="Activities" icon={<Activity className="h-4 w-4" />} count={counts.activities} viewAllTo="/activities" viewAllSearch={{ q: term }}>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {activities.data!.map((a) => (
                  <Link key={a.id} to="/activities/$id" params={{ id: a.id }} className="rounded-md border border-border bg-card p-4 hover:border-primary/50 transition-colors">
                    <div className="font-medium text-foreground">{a.name}</div>
                    {a.category && <div className="text-xs text-primary mt-1">{a.category}</div>}
                    {a.mechanism && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.mechanism}</div>}
                  </Link>
                ))}
              </div>
            </ResultGroup>
          )}

          {(term || category) && !loading && total === 0 && (
            <p className="text-muted-foreground text-sm">No matches. Try a different query or change filters.</p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ResultGroup({
  title, icon, count, viewAllTo, viewAllSearch, children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  viewAllTo: "/plants" | "/compounds" | "/activities";
  viewAllSearch: { q?: string };
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-display text-xl font-semibold flex items-center gap-2">
          <span className="text-primary">{icon}</span> {title}
          <span className="text-xs text-muted-foreground font-sans font-normal">({count})</span>
        </h2>
        {viewAllSearch.q && (
          <Link to={viewAllTo} search={viewAllSearch as never} className="text-xs text-primary hover:underline">
            View all in {title.toLowerCase()} →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
