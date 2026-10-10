"use client";

import { useActionState } from "react";
import { useCart } from "@/lib/providers";
import { placeOrder } from "@/app/actions";
import Link from "next/link";

export default function CheckoutForm({ customerName }) {
  const { items } = useCart();
  const [state, formAction, isPending] = useActionState(placeOrder, null);

  const total = items.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  if (items.length === 0) {
    return (
      <div className="max-w-2xl">
        <h1 className="font-serif text-3xl text-amber-400 mb-4">
          Checkout
        </h1>
        <p className="text-neutral-400 mb-6">
          Your cart is empty.{" "}
          <Link href="/menu" className="text-amber-400 hover:underline">
            Browse the menu
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-3xl text-amber-400 mb-6">
        Checkout
      </h1>

      <form action={formAction} className="space-y-4">
        <input
          type="hidden"
          name="items"
          value={JSON.stringify(items)}
        />

        <div>
          <label className="block text-sm text-neutral-400 mb-1">
            Your Name
          </label>
          <p className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100">
            {customerName}
          </p>
          <input type="hidden" name="customerName" value={customerName} />
          {state?.fieldErrors?.customerName && (
            <p className="text-red-400 text-xs mt-1">
              {state.fieldErrors.customerName[0]}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm text-neutral-400 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            name="phone"
            className="w-full bg-neutral-900 border border-neutral-700 text-neutral-100 px-3 py-2 rounded focus:outline-none focus:border-amber-400"
          />
          {state?.fieldErrors?.phone && (
            <p className="text-red-400 text-xs mt-1">
              {state.fieldErrors.phone[0]}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm text-neutral-400 mb-1">
            Delivery Address
          </label>
          <input
            type="text"
            name="address"
            className="w-full bg-neutral-900 border border-neutral-700 text-neutral-100 px-3 py-2 rounded focus:outline-none focus:border-amber-400"
          />
          {state?.fieldErrors?.address && (
            <p className="text-red-400 text-xs mt-1">
              {state.fieldErrors.address[0]}
            </p>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-neutral-800">
          <span className="text-neutral-400">Total</span>
          <span className="font-serif text-2xl text-amber-400">
            {total} Birr
          </span>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3 bg-amber-400 text-neutral-900 font-semibold rounded hover:bg-amber-500 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Placing order…" : "Place Order"}
        </button>
      </form>
    </div>
  );
}