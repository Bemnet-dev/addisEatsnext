import { notFound, redirect } from "next/navigation";
import { getOrderById } from "@/lib/orders";
import { requireSession } from "@/lib/session";
import OrderStatusClient from "./OrderStatusClient";

export default async function OrderStatusPage({ params }) {
    const { id } = await params;
    const { session, redirectTo } = await requireSession(`/orders/${id}`);
    if (redirectTo) redirect(redirectTo);

    const order = getOrderById(id);

    if (!order || (session.role !== "staff" && order.customerName !== session.name)) {
        notFound();
    }

    return <OrderStatusClient order={order} />;
}
