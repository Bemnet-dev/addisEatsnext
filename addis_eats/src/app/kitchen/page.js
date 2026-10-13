import { redirect } from "next/navigation";
import { getOrders } from "@/lib/orders";
import { requireSession } from "@/lib/session";
import OrderStatusControls from "./OrderStatusControls";

export const metadata = {
  title: "Kitchen",
  description: "Staff kitchen view — manage and fulfil incoming orders.",
  robots: { index: false, follow: false },
};

export default async function KitchenPage() {
  const { session, redirectTo } = await requireSession("/kitchen");
  if (redirectTo) redirect(redirectTo);
  if (session.role !== "staff") redirect("/orders");

  const orders = getOrders();

  return (
    <div className="space-y-6">
      <div className="border-b border-neutral-800 pb-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
          Staff workspace
        </p>
        <h1 className="font-serif text-3xl text-amber-300 sm:text-4xl">Kitchen orders</h1>
      </div>

      {orders.length === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-700 bg-neutral-900/60 p-8 text-sm text-neutral-400">
          No orders to prepare yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li
              key={order.id}
              className="rounded-md border border-neutral-800 bg-neutral-900/70 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-neutral-100">{order.customerName}</p>
                  <p className="text-sm text-neutral-400">{order.id}</p>
                </div>
                <span className="text-xs uppercase tracking-[0.18em] text-amber-300">
                  {order.status}
                </span>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-neutral-300">
                {order.items.map((item) => (
                  <li key={`${order.id}-${item.id}`}>
                    {item.name} × {item.qty}
                  </li>
                ))}
              </ul>
              <OrderStatusControls orderId={order.id} status={order.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
