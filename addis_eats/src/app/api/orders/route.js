import { NextResponse } from "next/server";
import { orderSchema } from "@/lib/schema";
import { addOrder } from "@/lib/orders";
import { getDishes } from "@/lib/dishes";
import { getSession } from "@/lib/session";

export async function POST(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in before placing an order." }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be an order object." }, { status: 400 });
  }
  body.customerName = session.name;

  // Only the dish id and quantity are trusted from the wire; name and price
  // are always re-read from the menu catalogue so a crafted body cannot
  // change what an order costs.
  const catalogue = new Map((await getDishes()).map((dish) => [dish.id, dish]));
  const submittedItems = Array.isArray(body.items) ? body.items : [];
  body.items = submittedItems
    .map((item) => {
      const dish = catalogue.get(item?.id);
      const qty = Math.floor(Number(item?.qty));
      if (!dish || !Number.isFinite(qty) || qty < 1) return null;
      return { id: dish.id, name: dish.name, price: dish.price, qty };
    })
    .filter(Boolean);

  if (submittedItems.length > 0 && body.items.length === 0) {
    return NextResponse.json(
      { error: "Cart items could not be matched to the menu." },
      { status: 422 }
    );
  }

  const parsed = orderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const order = addOrder({ ...parsed.data, status: "pending" });
  return NextResponse.json(order, { status: 201 });
}