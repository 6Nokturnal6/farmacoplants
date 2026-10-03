import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AdminUser = {
  id: string; email: string; displayName: string; role: "admin" | "curator" | "user";
  active: boolean; createdAt: string; lastSignInAt: string | null;
};

async function ensureAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !isAdmin) throw new Error("Forbidden");
  return import("./admin-ops.server");
}

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { runAdminOp } = await ensureAdmin(context);
    return (await runAdminOp("listUsers", {}, context.userId)) as AdminUser[];
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
    const { runAdminOp } = await ensureAdmin(context);
    return (await runAdminOp("createUser", data, context.userId)) as { id: string };
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
    const { runAdminOp } = await ensureAdmin(context);
    return (await runAdminOp("updateUser", data, context.userId)) as { ok: boolean };
  });

export const sendAdminPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), redirectTo: z.string().url().max(500) }))
  .handler(async ({ data, context }) => {
    const { runAdminOp } = await ensureAdmin(context);
    return (await runAdminOp("sendReset", data, context.userId)) as { email: string };
  });
