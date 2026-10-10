import { NextResponse } from "next/server";
import { findDish } from "@/lib/dishes";

export async function GET(request, { params }) {
  const { id } = await params;
  const dish = await findDish(id);

  if (!dish) {
    return NextResponse.json(
      { error: "Dish not found", id },
      { status: 404 }
    );
  }

  return NextResponse.json(dish);
}