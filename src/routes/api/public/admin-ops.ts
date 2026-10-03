import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { executeAdminOp, opSchemas, verifyAdminToken, type AdminOp } from "@/lib/admin-ops.server";

const bodySchema = z.object({
  op: z.enum(Object.keys(opSchemas) as [AdminOp, ...AdminOp[]]),
  data: z.unknown().optional(),
});

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

export const Route = createFileRoute("/api/public/admin-ops")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
        let callerId: string;
        try {
          callerId = await verifyAdminToken(auth.slice(7));
        } catch (e) {
          const msg = (e as Error).message;
          return json({ error: msg }, msg === "Forbidden" ? 403 : 401);
        }
        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json({ error: "Invalid request" }, 400);
        try {
          const result = await executeAdminOp(parsed.data.op, parsed.data.data, callerId);
          return json({ result });
        } catch (e) {
          console.error("admin-ops", parsed.data.op, e);
          return json({ error: (e as Error).message || "Operation failed" }, 400);
        }
      },
    },
  },
});
