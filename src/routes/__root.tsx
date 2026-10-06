import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-display font-bold text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  const message = error instanceof Error ? error.message : String(error);
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Try again
          </button>
          <a href="/" className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "FarmacoPlants — UniLúrio Natural Products Database" },
      { name: "description", content: "Open database of medicinal plants, their chemical constituents and pharmacological activities, curated at Universidade Lúrio, Mozambique." },
      { property: "og:title", content: "FarmacoPlants — UniLúrio" },
      { property: "og:description", content: "Open natural products database from Universidade Lúrio." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Runs before the app loads so the auth client can't strip the reset
            tokens from the URL first. Sends reset links landing anywhere to the form. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var h=location.hash;if(location.pathname!=="/reset-password"&&/type=recovery|error_description=/.test(h)){location.replace("/reset-password"+h);}}catch(e){}})();`,
          }}
        />
        <HeadContent />
      </head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  // Reset links can land on any page (e.g. "/#access_token=...&type=recovery")
  // when the auth server falls back to the site root. Send them to the reset form.
  useEffect(() => {
    if (window.location.pathname === "/reset-password") return;
    const hash = window.location.hash;
    if (/type=recovery|error_description=/.test(hash)) {
      window.location.replace(`/reset-password${hash}`);
      return;
    }
    let sub: { unsubscribe: () => void } | undefined;
    import("@/integrations/supabase/client").then(({ supabase }) => {
      sub = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY" && window.location.pathname !== "/reset-password") {
          router.navigate({ to: "/reset-password" });
        }
      }).data.subscription;
    });
    return () => sub?.unsubscribe();
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
