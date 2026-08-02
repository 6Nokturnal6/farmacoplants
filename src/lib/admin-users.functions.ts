import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError || !isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (authError) throw authError;

    const ids = authData.users.map((user) => user.id);
    const [{ data: profiles, error: profileError }, { data: roles, error: rolesError }] = await Promise.all([
      ids.length ? supabaseAdmin.from("profiles").select("id, email, display_name").in("id", ids) : Promise.resolve({ data: [], error: null }),
      ids.length ? supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids) : Promise.resolve({ data: [], error: null }),
    ]);
    if (profileError) throw profileError;
    if (rolesError) throw rolesError;

    return authData.users.map((user) => ({
      id: user.id,
      email: user.email ?? profiles?.find((profile) => profile.id === user.id)?.email ?? "",
      displayName: profiles?.find((profile) => profile.id === user.id)?.display_name ?? "",
      role: roles?.find((role) => role.user_id === user.id)?.role ?? "user",
      active: !user.banned_until || new Date(user.banned_until).getTime() <= Date.now(),
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? null,
    }));
  });

export const createAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    email: z.string().email().max(254),
    displayName: z.string().trim().min(1).max(100),
    password: z.string().min(8).max(128),
    role: z.enum(["admin", "curator", "user"]),
  }))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.toLowerCase(),
      password: data.password,
      email_confirm: true,
      user_metadata: { display_name: data.displayName },
    });
    if (createError) throw createError;
    if (!created.user) throw new Error("User creation failed");

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: created.user.id,
      email: data.email.toLowerCase(),
      display_name: data.displayName,
    });
    if (profileError) throw profileError;

    const { error: clearRoleError } = await supabaseAdmin.from("user_roles").delete().eq("user_id", created.user.id);
    if (clearRoleError) throw clearRoleError;
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: data.role });
    if (roleError) throw roleError;
    return { id: created.user.id };
  });

export const updateAdminUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    id: z.string().uuid(),
    displayName: z.string().trim().min(1).max(100),
    role: z.enum(["admin", "curator", "user"]),
    active: z.boolean(),
  }))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    if (data.id === context.userId && (!data.active || data.role !== "admin")) {
      throw new Error("You cannot deactivate or remove your own admin access.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      ban_duration: data.active ? "none" : "876000h",
      user_metadata: { display_name: data.displayName },
    });
    if (authError) throw authError;

    const { error: profileError } = await supabaseAdmin.from("profiles").update({ display_name: data.displayName }).eq("id", data.id);
    if (profileError) throw profileError;
    const { error: clearRoleError } = await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
    if (clearRoleError) throw clearRoleError;
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({ user_id: data.id, role: data.role });
    if (roleError) throw roleError;
    return { ok: true };
  });