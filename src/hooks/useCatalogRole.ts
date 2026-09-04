import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CatalogRole = {
  userId: string | null;
  isAdmin: boolean;
  isCurator: boolean;
  canWrite: boolean;
  loading: boolean;
};

export function useCatalogRole(): CatalogRole {
  const [userId, setUserId] = useState<string | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) { setRoles([]); return; }
    let cancelled = false;
    supabase.from("user_roles").select("role").eq("user_id", userId).then(({ data }) => {
      if (!cancelled) setRoles((data ?? []).map((r) => r.role as string));
    });
    return () => { cancelled = true; };
  }, [userId]);

  const isAdmin = roles.includes("admin");
  const isCurator = roles.includes("curator");
  return { userId, isAdmin, isCurator, canWrite: isAdmin || isCurator, loading };
}
