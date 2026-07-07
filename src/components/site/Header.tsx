import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import unilurioLogo from "@/assets/unilurio-logo.jpg.asset.json";

export function Header() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) { setIsAdmin(false); return; }
    supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [userId]);

  const linkCls = "text-sm font-medium text-foreground/70 hover:text-primary transition-colors";

  return (
    <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img src={unilurioLogo.url} alt="Universidade Lúrio" className="h-9 w-9 object-contain" />
          <div className="leading-tight">
            <div className="font-display text-lg font-semibold text-foreground">FarmacoPlants</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">UniLúrio · Mozambique</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link to="/compounds" className={linkCls} activeProps={{ className: "text-primary font-semibold" }}>Compounds</Link>
          <Link to="/plants" className={linkCls} activeProps={{ className: "text-primary font-semibold" }}>Plants</Link>
          <Link to="/activities" className={linkCls} activeProps={{ className: "text-primary font-semibold" }}>Activities</Link>
          <Link to="/citations" className={linkCls} activeProps={{ className: "text-primary font-semibold" }}>Citations</Link>
        </nav>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link to="/admin" className="text-sm font-medium text-accent-foreground bg-accent/80 hover:bg-accent px-3 py-1.5 rounded-md">
              Admin
            </Link>
          )}
          {userId ? (
            <button
              onClick={() => supabase.auth.signOut()}
              className="text-sm text-muted-foreground hover:text-foreground"
            >Sign out</button>
          ) : (
            <Link to="/login" className="text-sm font-medium text-primary hover:underline">Sign in</Link>
          )}
        </div>
      </div>
    </header>
  );
}
