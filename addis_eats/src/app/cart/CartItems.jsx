"use client";

import Link from "next/link";
import { useCart } from "@/lib/providers";

// Client leaf: only this component needs cart state.
// The page shell (page.js) is a server component.
export default function CartItems() {
  const { items, removeFromCart } = useCart();

  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

  if (items.length === 0) {
    return (
      <p className="text-neutral-400">
        Your cart is empty.{" "}
        <Link href="/menu" className="text-amber-400 hover:underline">
          Browse the menu
        </Link>
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-3 mb-6">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex justify-between items-center py-3 border-b border-neutral-800"
          >
            <div>
              <span className="text-neutral-100">{item.name}</span>
              <span className="text-neutral-400 text-sm ml-2">× {item.qty}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-amber-400">{item.price * item.qty} Birr</span>
              <button
                type="button"
                onClick={() => removeFromCart(item.id)}
                className="text-neutral-500 hover:text-red-400 text-sm"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex justify-between items-center mb-6 pb-4 border-b border-neutral-800">
        <span className="text-neutral-400">Total</span>
        <span className="font-serif text-2xl text-amber-400">{total} Birr</span>
      </div>

      <Link
        href="/checkout"
        className="inline-block px-6 py-3 bg-amber-400 text-neutral-900 rounded font-semibold hover:bg-amber-500 transition-colors"
      >
        Proceed to Checkout
      </Link>
    </>
  );
}
