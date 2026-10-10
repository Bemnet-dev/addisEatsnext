"use client";

import { useState, useTransition } from "react";
import { cancelOrder } from "@/app/actions";

/**
 * Owner-facing cancel control.
 *
 * It exists so the action has a real call site (server actions cannot be
 * invoked by name from the console — see src/app/ActionConsole.jsx) and so
 * the customer can drive a status change that the live poll then picks up.
 *
 * The button proves nothing about security: the refusal happens on the
 * server, in src/app/actions.js `cancelOrder`.
 */
export default function CancelOrderButton({ orderId, onDone }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState(null);

  const handleCancel = () => {
    startTransition(async () => {
      const result = await cancelOrder(orderId);
      setMessage(result?.error ?? "Order cancelled.");
      if (result?.success && typeof onDone === "function") {
        onDone();
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleCancel}
        disabled={isPending}
        className="rounded-md border border-rose-500/50 px-4 py-2 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Cancelling…" : "Cancel order"}
      </button>
      {message && (
        <p className="text-xs text-neutral-400" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
