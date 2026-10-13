"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import CategoryBar from "./CategoryBar";
import DishList from "./DishList";

const PAGE_SIZE = 4;

function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default function FilterShell({ dishes: initialDishes }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("default");
  const [searchTerm, setSearchTerm] = useState("");

  const debouncedSearch = useDebouncedValue(searchTerm, 350);
  const searchValue = debouncedSearch.trim();
  const page = Number(searchParams.get("page") ?? "1");
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const searchKey = searchValue
    ? `/api/dishes?search=${encodeURIComponent(searchValue)}&page=${safePage}`
    : null;

  const { data, isLoading, error } = useSWR(searchKey, fetcher, {
    fallbackData: {
      dishes: initialDishes,
      totalPages: Math.max(1, Math.ceil(initialDishes.length / PAGE_SIZE)),
      totalItems: initialDishes.length,
    },
    keepPreviousData: true,
  });

  const categories = ["All", ...new Set(initialDishes.map((dish) => dish.category))];
  const hasCurrentSearchResults = Boolean(
    searchValue && data?.searchTerm === searchValue.toLowerCase()
  );
  const dishes = hasCurrentSearchResults ? data.dishes : initialDishes;

  const sortedDishes = useMemo(() => {
    return [...dishes]
      .filter((dish) => {
        if (!searchValue || hasCurrentSearchResults) return true;
        return [dish.name, dish.description, dish.category]
          .join(" ")
          .toLowerCase()
          .includes(searchValue.toLowerCase());
      })
      .filter((dish) => category === "All" || dish.category === category)
      .sort((first, second) => {
        if (sort === "price-asc") return first.price - second.price;
        if (sort === "price-desc") return second.price - first.price;
        if (sort === "name") return first.name.localeCompare(second.name);
        return 0;
      });
  }, [category, dishes, hasCurrentSearchResults, searchValue, sort]);
  const totalPages = hasCurrentSearchResults
    ? data.totalPages
    : Math.max(1, Math.ceil(sortedDishes.length / PAGE_SIZE));
  const visibleDishes = hasCurrentSearchResults
    ? sortedDishes
    : sortedDishes.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    if (safePage > totalPages) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(totalPages));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [pathname, router, safePage, searchParams, totalPages]);

  const goToPage = (nextPage) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-md border border-neutral-800 bg-neutral-900/60 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <label htmlFor="dish-search" className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
            Search dishes
          </label>
          <input
            id="dish-search"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Try lamb, coffee, sambusa…"
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none transition-colors focus:border-amber-300"
          />
        </div>
      </div>

      <CategoryBar
        categories={categories}
        active={category}
        onSelect={(nextCategory) => {
          setCategory(nextCategory);
          if (safePage !== 1) {
            goToPage(1);
          }
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-4 text-sm text-neutral-400 sm:gap-4">
        <p aria-live="polite">
          {visibleDishes.length} {visibleDishes.length === 1 ? "dish" : "dishes"}
        </p>
        <label className="flex items-center gap-3">
          <span className="whitespace-nowrap">Sort by</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="max-w-[55%] rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none transition-colors focus:border-amber-300 sm:max-w-none"
          >
            <option value="default">Default</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="name">Name (A–Z)</option>
          </select>
        </label>
      </div>

      {error ? (
        <p className="rounded-md border border-rose-700/60 bg-rose-950/40 p-4 text-sm text-rose-200">
          Could not load dishes. Try again in a moment.
        </p>
      ) : null}

      {isLoading && !data ? (
        <p className="py-10 text-center text-sm text-neutral-400">Loading dishes…</p>
      ) : (
        <DishList dishes={visibleDishes} />
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            type="button"
            onClick={() => goToPage(Math.max(1, safePage - 1))}
            disabled={safePage === 1}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-neutral-300">
            Page {safePage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => goToPage(Math.min(totalPages, safePage + 1))}
            disabled={safePage === totalPages}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}