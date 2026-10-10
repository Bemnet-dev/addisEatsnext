import { NextResponse } from "next/server";
import { getDishes } from "@/lib/dishes";

export async function GET(request) {
  const searchTerm = request.nextUrl.searchParams.get("search")?.trim().toLowerCase() ?? "";
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const pageSize = 4;

  const dishes = await getDishes();
  const filteredDishes = searchTerm
    ? dishes.filter((dish) => {
      const haystack = [dish.name, dish.description, dish.category]
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchTerm);
    })
    : dishes;

  const totalPages = Math.max(1, Math.ceil(filteredDishes.length / pageSize));
  const safePage = Number.isFinite(page) && page > 0 ? Math.min(page, totalPages) : 1;
  const start = (safePage - 1) * pageSize;
  const paginatedDishes = filteredDishes.slice(start, start + pageSize);

  return NextResponse.json({
    dishes: paginatedDishes,
    searchTerm,
    page: safePage,
    totalPages,
    totalItems: filteredDishes.length,
  });
}