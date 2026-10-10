"use client";

import { useState, useTransition } from "react";
import { updateOrderStatus } from "@/app/actions";

const FLOW = [
  { status: "preparing", label: "Start preparing" },
  { status: "delivering", label: "Out for delivery" },
  { status: "delivered", label: "Mark delivered" },
];

/**
 * Kitchen controls. Every click runs the server action, which checks
 * session → role (staff only) → order existence before mutating.
 *
 * The customer's /orders/[id] screen polls every 5 s, so marking an order
 * "preparing" here shows up on the customer's phone without a reload — that
 * is the live-data demonstration for the presentation.
 */
export default function OrderStatusControls({ orderId, status }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState(null);

  const advance = (nextStatus) => {
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, nextStatus);
      setMessage(result?.error ?? `Status → ${result.status}`);
    });
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {FLOW.map((step) => (
        <button
          key={step.status}
          type="button"
          onClick={() => advance(step.status)}
          disabled={isPending || status === step.status}
          className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-200 transition-colors hover:border-amber-400 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {step.label}
        </button>
      ))}
      {status !== "cancelled" && (
        <button
          type="button"
          onClick={() => advance("cancelled")}
          disabled={isPending}
          className="rounded-md border border-rose-500/50 px-3 py-1.5 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Cancel
        </button>
      )}
      {message && (
        <span className="text-xs text-neutral-500" role="status">
          {message}
        </span>
      )}
    </div>
  );
}
