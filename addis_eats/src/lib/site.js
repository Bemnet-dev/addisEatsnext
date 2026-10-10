/**
 * Single source of truth for the absolute site URL.
 *
 * Every absolute URL the app emits — metadataBase, Open Graph images, canonical
 * links, sitemap and robots — is built from here so a shared link always points
 * at the deployed host (https://addiseatsnext.vercel.app) instead of a fallback
 * domain nobody controls.
 *
 * Override per environment with NEXT_PUBLIC_SITE_URL (Vercel project settings,
 * or .env.local for a different preview deployment).
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://addiseatsnext.vercel.app"
).replace(/\/+$/, "");

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}
