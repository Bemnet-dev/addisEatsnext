const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.addiseats.com";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/menu"],
      disallow: ["/api", "/signin", "/orders", "/checkout", "/cart", "/kitchen"],
    },
    sitemap: new URL("/sitemap.xml", SITE_URL).toString(),
  };
}
