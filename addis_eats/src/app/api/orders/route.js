import { NextResponse } from "next/server";
import { orderSchema } from "@/lib/schema";
import { addOrder } from "@/lib/orders";
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