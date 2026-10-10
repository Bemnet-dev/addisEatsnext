import { getDishes } from "@/lib/dishes";
import { absoluteUrl } from "@/lib/site";
import { toSlug } from "./menu/slug";

export default async function sitemap() {
  const dishes = await getDishes();

  const staticRoutes = [
    "",
    "/menu",
  ].map((path) => ({
    url: absoluteUrl(path),
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.8,
  }));

  const dishRoutes = dishes.map((dish) => ({
    url: absoluteUrl(`/menu/${toSlug(dish.name)}`),
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticRoutes, ...dishRoutes];
}
