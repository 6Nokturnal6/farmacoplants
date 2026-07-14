import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({ meta: [{ title: "Audit log — FarmacoPlants" }] }),
  component: AuditPage,
});

const TABLES = [
  "plants",
  "compounds",
  "pharmacological_activities",
  "citations",
  "entity_citations",
  "plant_compounds",
  "plant_activities",
  "compound_activities",
  "user_roles",
] as const;

const ACTIONS = ["insert", "update", "delete"] as const;
const PAGE_SIZE = 50;

function AuditPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tableFilter, setTableFilter] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [actorFilter, setActorFilter] = useState<string>("");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      if (!uid) navigate({ to: "/login" });
    });
  }, [navigate]);

  useEffect(() => {
    if (!userId) return;
    supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [userId]);

  const filterKey = useMemo(
    () => JSON.stringify({ tableFilter, actionFilter, actorFilter, page }),
    [tableFilter, actionFilter, actorFilter, page],
  );

  const { data, isLoading, error } = useQuery({
    enabled: !!isAdmin,
    queryKey: ["audit-log", filterKey],
    queryFn: async () => {
      let q = supabase
        .from("admin_audit_log")
        .select("id, actor_id, actor_email, action, table_name, row_id, old_data, new_data, created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (tableFilter) q = q.eq("table_name", tableFilter);
      if (actionFilter) q = q.eq("action", actionFilter);
      if (actorFilter.trim()) q = q.ilike("actor_email", `%${actorFilter.trim()}%`);
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

  if (!userId) return null;
  if (isAdmin === null) {
    return <div className="p-10 text-center text-muted-foreground">Checking access…</div>;
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 grid place-items-center px-4">
          <div className="max-w-md text-center">
            <h1 className="font-display text-2xl font-semibold">Admin access required</h1>
            <p className="text-sm text-muted-foreground mt-2">You need the admin role to view the audit log.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-3xl font-semibold">Audit log</h1>
          <Link to="/admin" className="text-sm underline text-muted-foreground hover:text-foreground">← Back to admin</Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-4 mb-4">
          <select
            value={tableFilter}
            onChange={(e) => { setTableFilter(e.target.value); setPage(0); }}
            className="border rounded px-3 py-2 bg-background text-sm"
          >
            <option value="">All tables</option>
            {TABLES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
            className="border rounded px-3 py-2 bg-background text-sm"
          >
            <option value="">All actions</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <input
            type="text"
            placeholder="Filter by actor email…"
            value={actorFilter}
            onChange={(e) => { setActorFilter(e.target.value); setPage(0); }}
            className="border rounded px-3 py-2 bg-background text-sm sm:col-span-2"
          />
        </div>

        {error && (
          <div className="rounded border border-destructive/40 bg-destructive/5 text-destructive px-3 py-2 text-sm mb-4">
            Failed to load: {(error as Error).message}
          </div>
        )}

        <div className="border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Actor</th>
                <th className="px-3 py-2 font-medium">Action</th>
                <th className="px-3 py-2 font-medium">Table</th>
                <th className="px-3 py-2 font-medium">Row</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!isLoading && data?.rows.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No entries match these filters.</td></tr>
              )}
              {data?.rows.map((r) => (
                <>
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">{r.actor_email ?? <span className="text-muted-foreground italic">system</span>}</td>
                    <td className="px-3 py-2">
                      <span className={
                        r.action === "insert" ? "text-green-700 dark:text-green-400" :
                        r.action === "delete" ? "text-red-700 dark:text-red-400" :
                        "text-amber-700 dark:text-amber-400"
                      }>{r.action}</span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{r.table_name}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.row_id?.slice(0, 8) ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                        className="text-xs underline text-muted-foreground hover:text-foreground"
                      >
                        {expanded === r.id ? "Hide" : "Diff"}
                      </button>
                    </td>
                  </tr>
                  {expanded === r.id && (
                    <tr key={`${r.id}-diff`} className="border-t bg-muted/30">
                      <td colSpan={6} className="px-3 py-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <div className="text-xs font-medium mb-1 text-muted-foreground">Before</div>
                            <pre className="text-xs bg-background border rounded p-2 overflow-auto max-h-80">{r.old_data ? JSON.stringify(r.old_data, null, 2) : "—"}</pre>
                          </div>
                          <div>
                            <div className="text-xs font-medium mb-1 text-muted-foreground">After</div>
                            <pre className="text-xs bg-background border rounded p-2 overflow-auto max-h-80">{r.new_data ? JSON.stringify(r.new_data, null, 2) : "—"}</pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4 text-sm">
          <div className="text-muted-foreground">
            {total.toLocaleString()} total · page {page + 1} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-3 py-1.5 border rounded disabled:opacity-40"
            >Previous</button>
            <button
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border rounded disabled:opacity-40"
            >Next</button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
