import FilterShell from "./FilterShell";
import { getDishes } from "@/lib/dishes";

export const metadata = {
  title: "Menu",
  description: "Browse Addis Eats favorites including doro wat, kitfo, burgers, pizza, and traditional drinks.",
};

export const revalidate = 3600;

export default async function MenuPage() {
  const dishes = await getDishes();

  return (
    <div className="py-4">
      <div className="mb-8 border-b border-neutral-800 pb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
          Addis, served fresh
        </p>
        <h1 className="font-serif text-3xl text-amber-300 sm:text-4xl">Our Menu</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-400">
          Ethiopian favorites, made for sharing. Choose a course to explore.
        </p>
      </div>
      <FilterShell dishes={dishes} />
    </div>
  );
}