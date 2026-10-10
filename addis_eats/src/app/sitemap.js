import { getDishes } from "@/lib/dishes";
import { toSlug } from "./menu/slug";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.addiseats.com";

export default async function sitemap() {
  const dishes = await getDishes();

  const staticRoutes = [
    "",
    "/menu",
  ].map((path) => ({
    url: new URL(path, SITE_URL).toString(),
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.8,
  }));

  const dishRoutes = dishes.map((dish) => ({
    url: new URL(`/menu/${toSlug(dish.name)}`, SITE_URL).toString(),
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...dishRoutes];
}
