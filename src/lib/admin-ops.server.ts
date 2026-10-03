// Privileged admin operations. Runs where the service-role key exists
// (Lovable Cloud). Self-hosted installs without the key relay to Lovable Cloud.
import { createClient } from "@supabase/supabase-js";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const DEFAULT_RELAY = "https://project--f42b3fae-2f01-404a-865c-c78e150f53fc.lovable.app";

const CATALOG_TABLES = [
  "plants", "compounds", "pharmacological_activities", "citations",
  "plant_compounds", "plant_activities", "compound_activities",
] as const;

export const opSchemas = {
  listUsers: z.object({}).passthrough(),
  overview: z.object({}).passthrough(),
  createUser: z.object({
    email: z.string().email().max(254),
    displayName: z.string().trim().min(1).max(100),
    password: z.string().min(8).max(128),
    role: z.enum(["admin", "curator", "user"]),
  }),
  updateUser: z.object({
    id: z.string().uuid(),
    displayName: z.string().trim().min(1).max(100),
    role: z.enum(["admin", "curator", "user"]),
    active: z.boolean(),
  }),
  sendReset: z.object({ id: z.string().uuid(), redirectTo: z.string().url().max(500) }),
};
export type AdminOp = keyof typeof opSchemas;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function runLocal(op: AdminOp, raw: unknown, callerId: string): Promise<unknown> {
  const sb = await admin();
  switch (op) {
    case "listUsers": {
      const { data: authData, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) throw error;
      const ids = authData.users.map((u) => u.id);
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        sb.from("profiles").select("id, email, display_name").in("id", ids),
        sb.from("user_roles").select("user_id, role").in("user_id", ids),
      ]);
      return authData.users.map((u) => ({
        id: u.id,
        email: u.email ?? profiles?.find((p) => p.id === u.id)?.email ?? "",
        displayName: profiles?.find((p) => p.id === u.id)?.display_name ?? "",
        role: roles?.find((r) => r.user_id === u.id)?.role ?? "user",
        active: !u.banned_until || new Date(u.banned_until).getTime() <= Date.now(),
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
      }));
    }
    case "overview": {
      const counts: Record<string, number> = {};
      await Promise.all(CATALOG_TABLES.map(async (t) => {
        const { count } = await sb.from(t).select("*", { count: "exact", head: true });
        counts[t] = count ?? 0;
      }));
      const { data: authData, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) throw error;
      const { data: roles } = await sb.from("user_roles").select("user_id, role");
      const now = Date.now();
      const users = authData.users.map((u) => ({
        active: !u.banned_until || new Date(u.banned_until).getTime() <= now,
        role: roles?.find((r) => r.user_id === u.id)?.role ?? "user",
        lastSignInAt: u.last_sign_in_at ?? null,
      }));
      const weekAgo = now - 7 * 864e5;
      const { data: recent } = await sb.from("admin_audit_log")
        .select("id, table_name, action, created_at, actor_email")
        .order("created_at", { ascending: false }).limit(8);
      const { count: auditWeek } = await sb.from("admin_audit_log")
        .select("*", { count: "exact", head: true }).gte("created_at", new Date(weekAgo).toISOString());
      return {
        catalog: counts,
        users: {
          total: users.length,
          active: users.filter((u) => u.active).length,
          deactivated: users.filter((u) => !u.active).length,
          admins: users.filter((u) => u.role === "admin").length,
          curators: users.filter((u) => u.role === "curator").length,
          viewers: users.filter((u) => u.role === "user").length,
          activeLastWeek: users.filter((u) => u.lastSignInAt && new Date(u.lastSignInAt).getTime() >= weekAgo).length,
          neverSignedIn: users.filter((u) => !u.lastSignInAt).length,
        },
        audit: {
          lastWeek: auditWeek ?? 0,
          recent: (recent ?? []).map((r) => ({
            id: r.id, table: r.table_name, action: r.action, at: r.created_at, actor: r.actor_email ?? "system",
          })),
        },
      };
    }
    case "createUser": {
      const d = opSchemas.createUser.parse(raw);
      const email = d.email.toLowerCase();
      const { data: created, error } = await sb.auth.admin.createUser({
        email, password: d.password, email_confirm: true, user_metadata: { display_name: d.displayName },
      });
      if (error) throw error;
      if (!created.user) throw new Error("User creation failed");
      const id = created.user.id;
      const { error: pe } = await sb.from("profiles").upsert({ id, email, display_name: d.displayName });
      if (pe) throw pe;
      await sb.from("user_roles").delete().eq("user_id", id);
      const { error: re } = await sb.from("user_roles").insert({ user_id: id, role: d.role });
      if (re) throw re;
      return { id };
    }
    case "updateUser": {
      const d = opSchemas.updateUser.parse(raw);
      if (d.id === callerId && (!d.active || d.role !== "admin")) {
        throw new Error("You cannot deactivate or remove your own admin access.");
      }
      const { error } = await sb.auth.admin.updateUserById(d.id, {
        ban_duration: d.active ? "none" : "876000h",
        user_metadata: { display_name: d.displayName },
      });
      if (error) throw error;
      const { error: pe } = await sb.from("profiles").update({ display_name: d.displayName }).eq("id", d.id);
      if (pe) throw pe;
      await sb.from("user_roles").delete().eq("user_id", d.id);
      const { error: re } = await sb.from("user_roles").insert({ user_id: d.id, role: d.role });
      if (re) throw re;
      return { ok: true };
    }
    case "sendReset": {
      const d = opSchemas.sendReset.parse(raw);
      const redirect = new URL(d.redirectTo);
      if (redirect.pathname !== "/reset-password") throw new Error("Invalid redirect target");
      const { data: target, error } = await sb.auth.admin.getUserById(d.id);
      if (error) throw error;
      const email = target.user?.email;
      if (!email) throw new Error("This account has no email address.");
      const pub = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      });
      const { error: re } = await pub.auth.resetPasswordForEmail(email, { redirectTo: redirect.toString() });
      if (re) throw re;
      return { email };
    }
  }
}

/** Verifies a bearer token belongs to an admin. Returns the user id. */
export async function verifyAdminToken(token: string): Promise<string> {
  const client = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized");
  const { data: isAdmin } = await client.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
  if (!isAdmin) throw new Error("Forbidden");
  return data.user.id;
}

export async function executeAdminOp(op: AdminOp, data: unknown, callerId: string): Promise<unknown> {
  return runLocal(op, opSchemas[op].parse(data ?? {}), callerId);
}

/** Entry point for server functions: runs locally if the key exists, otherwise relays. */
export async function runAdminOp(op: AdminOp, data: unknown, callerId: string): Promise<unknown> {
  if (process.env["SUPABASE_SERVICE_ROLE_KEY"]) return executeAdminOp(op, data, callerId);

  const relay = (process.env["ADMIN_RELAY_URL"] || DEFAULT_RELAY).replace(/\/$/, "");
  const auth = getRequestHeader("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) throw new Error("Unauthorized");
  const res = await fetch(`${relay}/api/public/admin-ops`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body: JSON.stringify({ op, data }),
  });
  const body = (await res.json().catch(() => ({}))) as { result?: unknown; error?: string };
  if (!res.ok) throw new Error(body.error || `Admin service error (${res.status})`);
  return body.result;
}
