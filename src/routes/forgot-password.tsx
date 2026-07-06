import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Leaf } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — FarmacoPlants" }] }),
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      setError(err.message ?? "Could not send reset email");
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
            <span className="grid place-items-center h-12 w-12 mx-auto rounded-md bg-primary text-primary-foreground">
              <Leaf className="h-5 w-5" />
            </span>
            <h1 className="font-display text-3xl font-semibold mt-4">Reset password</h1>
            <p className="text-sm text-muted-foreground mt-1">We'll email you a reset link</p>
          </div>
          {sent ? (
            <div className="rounded-md border border-border bg-card p-4 text-sm">
              If an account exists for <span className="font-medium">{email}</span>, a reset link is on its way. Check your inbox (and spam).
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-3 py-2 rounded-md border border-border bg-card text-sm"
              />
              {error && <div className="text-sm text-destructive">{error}</div>}
              <button
                disabled={loading}
                className="w-full py-2 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? "…" : "Send reset link"}
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
