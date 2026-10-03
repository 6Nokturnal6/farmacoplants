import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Overview = {
  catalog: Record<string, number>;
  users: {
    total: number; active: number; deactivated: number; admins: number; curators: number;
    viewers: number; activeLastWeek: number; neverSignedIn: number;
  };
  audit: { lastWeek: number; recent: { id: string; table: string; action: string; at: string; actor: string }[] };
};

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error || !isAdmin) throw new Error("Forbidden");
    const { runAdminOp } = await import("./admin-ops.server");
    return (await runAdminOp("overview", {}, context.userId)) as Overview;
  });
