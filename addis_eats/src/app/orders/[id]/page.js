import { notFound, redirect } from "next/navigation";
import { getOrderById } from "@/lib/orders";
import { requireSession } from "@/lib/session";
import OrderStatusClient from "./OrderStatusClient";

export async function generateMetadata({ params }) {
  const { id } = await params;

  return {
    title: `Order ${id}`,
    description: "Live status for your Addis Eats order, refreshed automatically.",
    robots: { index: false, follow: false },
  };
}

export default async function OrderStatusPage({ params }) {
    const { id } = await params;
    // Page layer: session verified independently of the proxy.
    const { session, redirectTo } = await requireSession(`/orders/${id}`);
    if (redirectTo) redirect(redirectTo);

    // Ownership layer: the id in the URL is never trusted — a mismatch is a
    // 404, so changing it to another account's id leaks nothing.
    const order = getOrderById(id);

    if (!order || (session.role !== "staff" && order.customerName !== session.name)) {
        notFound();
    }

    return <OrderStatusClient order={order} />;
}
