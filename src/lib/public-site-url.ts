const configuredSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL?.trim();

export function getPublicSiteUrl(): string {
  if (configuredSiteUrl) return configuredSiteUrl.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "https://farmacoplants.unilurio.ac.mz";
}