import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrders } from "@/lib/orders";
import { requireSession } from "@/lib/session";

export const metadata = {
  title: "My Orders",
  description: "View and track your Addis Eats order history.",
  robots: { index: false, follow: false },
};

export default async function OrdersPage() {
    const { session, redirectTo } = await requireSession("/orders");
    if (redirectTo) redirect(redirectTo);

    const orders = getOrders().filter((order) =>
        session.role === "staff" || order.customerName === session.name
    );

    return (
        <div className="space-y-6">
            <div className="border-b border-neutral-800 pb-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
                    Order tracker
                </p>
                <h1 className="font-serif text-3xl text-amber-300 sm:text-4xl">Recent orders</h1>
            </div>

            {orders.length === 0 ? (
                <p className="rounded-md border border-dashed border-neutral-700 bg-neutral-900/60 p-8 text-sm text-neutral-400">
                    No orders yet. Place one from the checkout flow to see live status updates.
                </p>
            ) : (
                <ul className="space-y-3">
                    {orders.map((order) => (
                        <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-neutral-800 bg-neutral-900/70 p-4">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs uppercase tracking-[0.18em] text-emerald-400">{order.status}</p>
                                <p className="mt-2 truncate font-semibold text-neutral-100">{order.customerName}</p>
                                <p className="truncate text-sm text-neutral-400">{order.id}</p>
                            </div>

                            <Link
                                href={`/orders/${order.id}`}
                                className="shrink-0 rounded-md border border-amber-400/80 px-4 py-2 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-400 hover:text-neutral-950"
                            >
                                View status
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
