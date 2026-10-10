import { NextResponse } from "next/server";
import { getOrderById } from "@/lib/orders";
import { getSession } from "@/lib/session";

export async function GET(_request, { params }) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Sign in to view this order." }, { status: 401 });
    }

    const { id } = await params;
    const order = getOrderById(id);

    if (!order || (session.role !== "staff" && order.customerName !== session.name)) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order);
}
