import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import unilurioLogo from "@/assets/unilurio-logo.jpg.asset.json";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set new password — FarmacoPlants" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Supabase parses the recovery tokens in the URL hash and fires PASSWORD_RECOVERY.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError("Password must be at least 6 characters");
    if (password !== confirm) return setError("Passwords do not match");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      await supabase.auth.signOut();
      setTimeout(() => navigate({ to: "/login" }), 1500);
    } catch (err: any) {
      setError(err.message ?? "Could not update password");
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
            <img src={unilurioLogo.url} alt="Universidade Lúrio" className="h-16 w-16 mx-auto object-contain" />
            <h1 className="font-display text-3xl font-semibold mt-4">Set new password</h1>
            <p className="text-sm text-muted-foreground mt-1">Choose a new password for your account</p>
          </div>
          {done ? (
            <div className="rounded-md border border-border bg-card p-4 text-sm">
              Password updated. Redirecting to sign in…
            </div>
          ) : !ready ? (
            <div className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
              Waiting for reset link… If you opened this page directly, use the link from your email.
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                className="w-full px-3 py-2 rounded-md border border-border bg-card text-sm"
              />
              <input
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-3 py-2 rounded-md border border-border bg-card text-sm"
              />
              {error && <div className="text-sm text-destructive">{error}</div>}
              <button
                disabled={loading}
                className="w-full py-2 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? "…" : "Update password"}
              </button>
            </form>
          )}
          <div className="text-center mt-6">
            <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground">← Back to sign in</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
