// Server component shell — no "use client".
// CartItems is the client leaf that reads cart context.
// Moving "use client" down the tree keeps this page's
// server-rendered HTML in the initial payload and reduces
// the JS the browser must parse before becoming interactive (TBT).
import CartItems from "./CartItems";

export const metadata = {
  title: "Cart",
  description: "Review your order before checkout.",
};

export default function CartPage() {
  return (
    <div className="max-w-2xl">
      <div className="border-b border-neutral-800 pb-5 mb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
          Your order
        </p>
        <h1 className="font-serif text-4xl text-amber-300">Cart</h1>
      </div>

      <CartItems />
    </div>
  );
}
