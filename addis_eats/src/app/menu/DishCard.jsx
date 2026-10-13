import Image from "next/image";
import Link from "next/link";
import { getDishCardImage } from "@/lib/dishes";
import { toSlug } from "./slug";

export default function DishCard({ dish, priority = false, preload = false }) {
  return (
    <li className="group min-w-0">
      <Link
        href={`/menu/${toSlug(dish.name)}`}
        prefetch={false}
        className="flex h-full min-h-40 flex-col overflow-hidden rounded-md border border-neutral-800 bg-neutral-900/70 transition-colors hover:border-emerald-500/70 hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
      >
        {/* Responsive grid image: 1 col on mobile, up to 3 on xl inside
            `max-w-6xl` (~1152px), so a card lands near 360–384px wide. `sizes`
            lets the optimizer serve that variant instead of the full 512px
            source. Only the first card of a page (the likely LCP) is preloaded
            and given `fetchPriority="high"` — preloading every card would
            compete with it for bandwidth. */}
        <Image
          src={getDishCardImage(dish.image)}
          alt={`Photo of ${dish.name}`}
          width={512}
          height={288}
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
          preload={preload}
          fetchPriority={priority ? "high" : undefined}
          className="aspect-[16/9] w-full bg-neutral-800 object-cover"
        />
        <span className="flex flex-1 flex-col p-4 sm:p-5">
          <span className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-400 sm:mb-4">
            {dish.category}
          </span>
          <span className="flex items-start justify-between gap-3">
            <strong className="font-serif text-base font-medium text-neutral-100 transition-colors group-hover:text-amber-300 sm:text-lg">
              {dish.name}
            </strong>
            <span className="shrink-0 text-sm font-semibold text-amber-300">
              {dish.price} Br
            </span>
          </span>
          <span className="mt-2 text-sm leading-6 text-neutral-400">
            {dish.description}
          </span>
        </span>
      </Link>
    </li>
  );
}
