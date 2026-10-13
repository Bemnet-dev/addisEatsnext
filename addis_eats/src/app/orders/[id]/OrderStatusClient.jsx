"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import CancelOrderButton from "./CancelOrderButton";

const STATUS_STYLES = {
    pending: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
    preparing: "bg-blue-500/15 text-blue-300 border border-blue-500/30",
    delivering: "bg-violet-500/15 text-violet-300 border border-violet-500/30",
    delivered: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
    cancelled: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
};

export default function OrderStatusClient({ order }) {
    const { data, isLoading, mutate } = useSWR(`/api/orders/${order.id}`, fetcher, {
        fallbackData: order,
        revalidateOnFocus: false,
        refreshInterval: (latestOrder) =>
            latestOrder && ["delivered", "cancelled"].includes(latestOrder.status)
                ? 0
                : 5000,
    });

    const currentOrder = data ?? order;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-5">
                <div className="min-w-0">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                        Live status
                    </p>
                    <h1 className="font-serif text-3xl text-amber-300 break-words sm:text-4xl">
                        Order {currentOrder.id}
                    </h1>
                </div>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-4 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm text-neutral-400">Customer</p>
                        <p className="mt-1 text-xl font-semibold text-neutral-100">{currentOrder.customerName}</p>
                    </div>

                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${STATUS_STYLES[currentOrder.status] ?? STATUS_STYLES.pending}`}>
                        {currentOrder.status}
                    </span>
                </div>

                <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div>
                        <dt className="text-xs uppercase tracking-[0.18em] text-neutral-500">Phone</dt>
                        <dd className="mt-1 text-neutral-100">{currentOrder.phone}</dd>
                    </div>
                    <div>
                        <dt className="text-xs uppercase tracking-[0.18em] text-neutral-500">Address</dt>
                        <dd className="mt-1 text-neutral-100">{currentOrder.address}</dd>
                    </div>
                </dl>

                <div className="mt-6">
                    <p className="mb-3 text-xs uppercase tracking-[0.18em] text-neutral-500">Items</p>
                    <ul className="space-y-2">
                        {currentOrder.items.map((item) => (
                            <li key={`${currentOrder.id}-${item.id}`} className="flex items-center justify-between rounded-md border border-neutral-800 bg-neutral-950/60 px-4 py-3 text-sm text-neutral-200">
                                <span>
                                    {item.name} × {item.qty}
                                </span>
                                <span className="text-amber-300">{item.price * item.qty} Br</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {!["delivered", "cancelled"].includes(currentOrder.status) ? (
                    <div className="mt-6">
                        <CancelOrderButton orderId={order.id} onDone={() => mutate()} />
                    </div>
                ) : null}

                {isLoading && !data ? (
                    <div className="mt-6 flex items-center gap-2 text-sm text-neutral-400">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                        Refreshing order status…
                    </div>
                ) : null}
            </div>
        </div>
    );
}
