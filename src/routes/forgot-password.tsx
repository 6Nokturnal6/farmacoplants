import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { friendlyAuthError } from "@/lib/auth-errors";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import unilurioLogo from "@/assets/unilurio-logo.jpg";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [
    { title: "Reset password — FarmacoPlants" },
    { name: "description", content: "Request a secure FarmacoPlants password reset link." },
    { property: "og:title", content: "Reset password — FarmacoPlants" },
    { property: "og:description", content: "Request a secure FarmacoPlants password reset link." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ForgotPassword,
});

const COOLDOWN_SECONDS = 60;
const COOLDOWN_KEY = "fp:reset-cooldown-until";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const tick = () => {
      const until = Number(localStorage.getItem(COOLDOWN_KEY) ?? 0);
      setCooldown(Math.max(0, Math.ceil((until - Date.now()) / 1000)));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [sent]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (cooldown > 0) {
      setError(`Please wait ${cooldown}s before requesting another link.`);
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getPublicSiteUrl()}/reset-password`,
      });
      if (error) throw error;
      localStorage.setItem(COOLDOWN_KEY, String(Date.now() + COOLDOWN_SECONDS * 1000));
      setSent(true);
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
                disabled={loading || cooldown > 0}
                className="w-full py-2 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? "…" : cooldown > 0 ? `Wait ${cooldown}s` : "Send reset link"}
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
