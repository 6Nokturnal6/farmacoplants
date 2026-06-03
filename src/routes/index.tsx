import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { SearchBar } from "@/components/site/SearchBar";
import { supabase } from "@/integrations/supabase/client";
import { Leaf, FlaskConical, Activity, BookOpen } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FarmacoPlants — Medicinal Plants & Their Pharmacology" },
      { name: "description", content: "Search a curated database linking medicinal plants to their chemical constituents and pharmacological activities." },
    ],
  }),
  component: Home,
});

function useCount(table: "plants" | "compounds" | "pharmacological_activities" | "citations") {
  return useQuery({
    queryKey: ["count", table],
    queryFn: async () => {
      const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });
}

function Home() {
  const compounds = useCount("compounds");
  const plants = useCount("plants");
  const activities = useCount("pharmacological_activities");
  const citations = useCount("citations");

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-background via-secondary/40 to-background" />
          <div className="absolute inset-0 -z-10 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, var(--foreground) 1px, transparent 0)", backgroundSize: "24px 24px" }} />
          <div className="mx-auto max-w-5xl px-6 py-20 md:py-28 text-center">
            <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-primary border border-primary/30 rounded-full px-3 py-1 bg-primary/5">
              <Leaf className="h-3 w-3" /> Universidade Lúrio · FCS
            </div>
            <h1 className="mt-6 font-display text-5xl md:text-6xl font-semibold leading-[1.05] text-foreground">
              FarmacoPlants
            </h1>
            <p className="mt-5 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              An open collection linking <span className="text-foreground font-medium">medicinal plants</span>, their <span className="text-foreground font-medium">chemical constituents</span>, and their <span className="text-foreground font-medium">pharmacological activities</span>.
            </p>

            <div className="mt-10 max-w-2xl mx-auto">
              <SearchBar scope="all" placeholder="Search a compound, plant, activity, or SMILES…" />
              <p className="text-xs text-muted-foreground mt-3">
                Try: <Link to="/search" search={{ q: "quercetin", kind: "all" } as never} className="underline hover:text-primary">quercetin</Link>
                {" · "}
                <Link to="/search" search={{ q: "Catharanthus", kind: "all" } as never} className="underline hover:text-primary">Catharanthus roseus</Link>
                {" · "}
                <Link to="/search" search={{ q: "antimalarial", kind: "all" } as never} className="underline hover:text-primary">antimalarial</Link>
              </p>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="mx-auto max-w-7xl px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<FlaskConical className="h-5 w-5" />} label="Compounds" value={compounds.data} to="/compounds" />
          <StatCard icon={<Leaf className="h-5 w-5" />} label="Plants" value={plants.data} to="/plants" />
          <StatCard icon={<Activity className="h-5 w-5" />} label="Activities" value={activities.data} to="/activities" />
          <StatCard icon={<BookOpen className="h-5 w-5" />} label="Citations" value={citations.data} to="/citations" />
        </section>

        {/* INTRO */}
        <section className="mx-auto max-w-5xl px-6 py-12">
          <div className="grid md:grid-cols-3 gap-8">
            <Feature title="Plants" body="Scientific name, taxonomy, local names, geographic origin, traditional uses, and the parts studied." />
            <Feature title="Constituents" body="Isolated compounds with SMILES, molecular formula and weight, drawn 2D structures, and the plant they were isolated from." />
            <Feature title="Pharmacology" body="Reported activities and mechanisms, linked back to the compound or whole-plant extract responsible." />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function StatCard({ icon, label, value, to }: { icon: React.ReactNode; label: string; value: number | undefined; to: string }) {
  return (
    <Link to={to} className="group rounded-lg border border-border bg-card p-5 hover:border-primary/50 hover:shadow-sm transition-all">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider font-medium">
        <span className="text-primary">{icon}</span> {label}
      </div>
      <div className="mt-2 font-display text-3xl font-semibold text-foreground tabular-nums">
        {value?.toLocaleString() ?? "—"}
      </div>
    </Link>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-display text-xl font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}
