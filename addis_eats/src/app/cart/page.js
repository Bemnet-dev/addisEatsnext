import CartItems from "./CartItems";

export const metadata = {
  title: "Cart",
  description: "Review your order before checkout.",
  robots: { index: false, follow: false },
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
