// Maps Supabase Auth errors to friendlier messages, especially rate-limit ones.
// Supabase enforces built-in limits (signups/IP/hr, ~60s between password
// resets per email, etc.) — we surface them here instead of raw provider text.
export function friendlyAuthError(err: unknown): string {
  const msg = (err as { message?: string } | null)?.message ?? "";
  const low = msg.toLowerCase();

  if (low.includes("rate limit") || low.includes("too many") || low.includes("over_email_send_rate_limit")) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  if (low.includes("for security purposes") && low.includes("seconds")) {
    // e.g. "For security purposes, you can only request this after 45 seconds."
    return msg;
  }
  if (low.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }
  if (low.includes("email not confirmed")) {
    return "Email not confirmed yet. Check your inbox.";
  }
  if (low.includes("user already registered")) {
    return "An account with that email already exists.";
  }
  return msg || "Something went wrong. Please try again.";
}
