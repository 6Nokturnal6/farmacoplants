import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Activity, Database, ShieldCheck, Users } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { getAdminOverview } from "@/lib/admin-dashboard.functions";

export const Route = createFileRoute("/admin_/dashboard")({
  head: () => ({
    meta: [
      { title: "Admin dashboard — FarmacoPlants" },
      { name: "description", content: "Overview of users, roles, access levels and catalogue activity for FarmacoPlants." },
      { property: "og:title", content: "Admin dashboard — FarmacoPlants" },
      { property: "og:description", content: "Overview of users, roles, access levels and catalogue activity for FarmacoPlants." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminDashboard,
});

const CATALOG_LABELS: Record<string, string> = {
  plants: "Plants",
  compounds: "Compounds",
  pharmacological_activities: "Activities",
  citations: "Citations",
  plant_compounds: "Plant ↔ compound links",
  plant_activities: "Plant ↔ activity links",
  compound_activities: "Compound ↔ activity links",
};

const ACCESS_LEVELS = [
  {
    role: "Admin",
    scope: "Full control",
    detail: "Curate all records, manage users and roles, activate/deactivate accounts, send password resets, read the audit log.",
  },
  {
    role: "Curator",
    scope: "Content only",
    detail: "Signed-in contributor role reserved for catalogue curation. No user management and no audit-log access.",
  },
  {
    role: "User",
    scope: "Read-only",
    detail: "Signed-in account with public browsing and search only. Default role for every new account.",
  },
  {
    role: "Anonymous",
    scope: "Public site",
    detail: "Visitors can browse published plants, compounds, activities and citations. No write access of any kind.",
  },
];

function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-md border border-border p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function AdminDashboard() {
  const overviewFn = useServerFn(getAdminOverview);
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setAuthChecked(true);
    });
  }, []);

  const overview = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => overviewFn(),
    enabled: Boolean(userId),
    retry: false,
  });

  const data = overview.data;
  const forbidden = /forbidden/i.test(overview.error?.message ?? "");

  if (authChecked && !userId) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 grid place-items-center px-4 py-16 text-center">
          <div className="max-w-sm">
            <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground" />
            <h1 className="mt-4 font-display text-2xl font-semibold">Admin sign-in required</h1>
            <p className="mt-2 text-sm text-muted-foreground">Sign in with your own account to manage users, roles and access levels.</p>
            <Link
              to="/login"
              search={{ redirect: "/admin/dashboard" }}
              className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Sign in
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-6xl w-full px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold">Admin dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">Users, roles, access levels and catalogue health for farmacoPlants.</p>
          </div>
          <nav className="flex flex-wrap gap-3 text-sm">
            <Link to="/admin/users" className="inline-flex items-center gap-1.5 underline text-muted-foreground hover:text-foreground"><Users className="h-4 w-4" /> Users & roles</Link>
            <Link to="/admin" className="inline-flex items-center gap-1.5 underline text-muted-foreground hover:text-foreground"><Database className="h-4 w-4" /> Curation</Link>
            <Link to="/admin/audit" className="inline-flex items-center gap-1.5 underline text-muted-foreground hover:text-foreground"><Activity className="h-4 w-4" /> Audit log</Link>
          </nav>
        </div>

        {(overview.isLoading || !authChecked) && <p className="mt-8 text-sm text-muted-foreground">Loading dashboard…</p>}
        {overview.error && (
          <p className="mt-8 text-sm text-destructive">
            {forbidden ? "Your account does not have admin access. Ask an existing admin to grant you the admin role." : overview.error.message}
          </p>
        )}


        {data && (
          <>
            <section className="mt-8">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5" /> People</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total accounts" value={data.users.total} hint={`${data.users.active} active · ${data.users.deactivated} deactivated`} />
                <StatCard label="Admins" value={data.users.admins} hint="Full control" />
                <StatCard label="Curators" value={data.users.curators} hint="Content only" />
                <StatCard label="Read-only users" value={data.users.viewers} />
                <StatCard label="Signed in last 7 days" value={data.users.activeLastWeek} />
                <StatCard label="Never signed in" value={data.users.neverSignedIn} hint="May need a password reset" />
                <StatCard label="Admin changes (7 days)" value={data.audit.lastWeek} />
                <StatCard label="Deactivated" value={data.users.deactivated} hint="Cannot sign in" />
              </div>
            </section>

            <section className="mt-10">
              <h2 className="text-lg font-semibold flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Access levels</h2>
              <div className="mt-4 overflow-x-auto border-y border-border">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="py-3 pr-4">Role</th><th className="py-3 pr-4">Access</th><th className="py-3">What it allows</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ACCESS_LEVELS.map((level) => (
                      <tr key={level.role}>
                        <td className="py-3 pr-4 font-medium">{level.role}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{level.scope}</td>
                        <td className="py-3 text-muted-foreground">{level.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Roles live in a dedicated table and are enforced by database policies, so changing a role here changes what the account can do everywhere.</p>
            </section>

            <section className="mt-10">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Database className="h-5 w-5" /> Catalogue</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(data.catalog).map(([table, count]) => (
                  <StatCard key={table} label={CATALOG_LABELS[table] ?? table} value={count} />
                ))}
              </div>
            </section>

            <section className="mt-10 mb-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold flex items-center gap-2"><Activity className="h-5 w-5" /> Recent admin activity</h2>
                <Link to="/admin/audit" className="text-sm underline text-muted-foreground hover:text-foreground">Full audit log →</Link>
              </div>
              <div className="mt-4 overflow-x-auto border-y border-border">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="py-3 pr-4">When</th><th className="py-3 pr-4">Who</th><th className="py-3 pr-4">Action</th><th className="py-3">Table</th></tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.audit.recent.map((entry) => (
                      <tr key={entry.id}>
                        <td className="py-3 pr-4 text-muted-foreground">{new Date(entry.at).toLocaleString()}</td>
                        <td className="py-3 pr-4">{entry.actor}</td>
                        <td className="py-3 pr-4 uppercase text-xs">{entry.action}</td>
                        <td className="py-3 text-muted-foreground">{entry.table}</td>
                      </tr>
                    ))}
                    {data.audit.recent.length === 0 && (
                      <tr><td colSpan={4} className="py-4 text-sm text-muted-foreground">No changes recorded yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
