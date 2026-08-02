import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";

import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { friendlyAuthError } from "@/lib/auth-errors";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import unilurioLogo from "@/assets/unilurio-logo.jpg";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [
    { title: "Sign in — FarmacoPlants" },
    { name: "description", content: "Sign in to curate the FarmacoPlants natural products database." },
    { property: "og:title", content: "Sign in — FarmacoPlants" },
    { property: "og:description", content: "Sign in to curate the FarmacoPlants natural products database." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: getPublicSiteUrl(),
            data: { display_name: name },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: "/" });
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 grid place-items-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <img src={unilurioLogo} alt="Universidade Lúrio" className="h-16 w-16 mx-auto object-contain" />
            <h1 className="font-display text-3xl font-semibold mt-4">{mode === "signin" ? "Sign in" : "Create account"}</h1>
            <p className="text-sm text-muted-foreground mt-1">Curator access to FarmacoPlants</p>
          </div>
          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" className="w-full px-3 py-2 rounded-md border border-border bg-card text-sm" />
            )}
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full px-3 py-2 rounded-md border border-border bg-card text-sm" />
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full px-3 py-2 rounded-md border border-border bg-card text-sm" />
            {error && <div className="text-sm text-destructive">{error}</div>}
            <button disabled={loading} className="w-full py-2 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50">
              {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
          <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="mt-4 w-full text-sm text-muted-foreground hover:text-primary">
            {mode === "signin" ? "Need an account? Create one" : "Already have an account? Sign in"}
          </button>
          {mode === "signin" && (
            <div className="text-center mt-2">
              <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary">Forgot password?</Link>
            </div>
          )}
          <div className="text-center mt-6"><Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Back to home</Link></div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
