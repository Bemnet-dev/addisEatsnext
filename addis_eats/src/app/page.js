import Link from "next/link";

export const metadata = {
  title: "Addis Eats — Authentic Ethiopian restaurant, menu & delivery",
  description: "Explore Addis Eats for fresh Ethiopian dishes, coffee, and street-food favorites.",
};

export default function HomePage() {
  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-3xl text-amber-400 mb-4">
        Addis Eats
      </h1>
      <p className="text-neutral-400 mb-6">
        Welcome to our restaurant.
      </p>
      <nav className="flex flex-wrap gap-3">
        <Link
          href="/menu"
          prefetch={false}
          className="px-5 py-2 border border-neutral-700 rounded text-amber-400 text-sm hover:bg-amber-400 hover:text-neutral-900 transition-colors"
        >
          Menu
        </Link>
        <Link
          href="/cart"
          prefetch={false}
          className="px-5 py-2 border border-neutral-700 rounded text-amber-400 text-sm hover:bg-amber-400 hover:text-neutral-900 transition-colors"
        >
          Cart
        </Link>
        <Link
          href="/checkout"
          prefetch={false}
          className="px-5 py-2 border border-neutral-700 rounded text-amber-400 text-sm hover:bg-amber-400 hover:text-neutral-900 transition-colors"
        >
          Checkout
        </Link>
      </nav>
    </div>
  );
}