import { absoluteUrl } from "@/lib/site";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/menu"],
      disallow: ["/api", "/signin", "/orders", "/checkout", "/cart", "/kitchen"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
