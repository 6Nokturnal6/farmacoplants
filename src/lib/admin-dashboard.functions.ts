import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CATALOG_TABLES = [
  "plants",
  "compounds",
  "pharmacological_activities",
  "citations",
  "plant_compounds",
  "plant_activities",
  "compound_activities",
] as const;

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const counts: Record<string, number> = {};
    await Promise.all(
      CATALOG_TABLES.map(async (table) => {
        const { count } = await supabaseAdmin.from(table).select("*", { count: "exact", head: true });
        counts[table] = count ?? 0;
      }),
    );

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (authError) throw authError;
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");

    const now = Date.now();
    const users = authData.users.map((user) => ({
      id: user.id,
      active: !user.banned_until || new Date(user.banned_until).getTime() <= now,
      role: roles?.find((row) => row.user_id === user.id)?.role ?? "user",
      lastSignInAt: user.last_sign_in_at ?? null,
    }));

    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const { data: recentAudit } = await supabaseAdmin
      .from("admin_audit_log")
      .select("id, table_name, action, changed_at, actor_email")
      .order("changed_at", { ascending: false })
      .limit(8);

    const { count: auditWeek } = await supabaseAdmin
      .from("admin_audit_log")
      .select("*", { count: "exact", head: true })
      .gte("changed_at", new Date(sevenDaysAgo).toISOString());

    return {
      catalog: counts,
      users: {
        total: users.length,
        active: users.filter((user) => user.active).length,
        deactivated: users.filter((user) => !user.active).length,
        admins: users.filter((user) => user.role === "admin").length,
        curators: users.filter((user) => user.role === "curator").length,
        viewers: users.filter((user) => user.role === "user").length,
        activeLastWeek: users.filter((user) => user.lastSignInAt && new Date(user.lastSignInAt).getTime() >= sevenDaysAgo).length,
        neverSignedIn: users.filter((user) => !user.lastSignInAt).length,
      },
      audit: {
        lastWeek: auditWeek ?? 0,
        recent: (recentAudit ?? []).map((row) => ({
          id: row.id,
          table: row.table_name,
          action: row.action,
          at: row.changed_at,
          actor: row.actor_email ?? "system",
        })),
      },
    };
  });
