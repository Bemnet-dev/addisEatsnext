import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-8">
      <h2 className="font-serif text-xl text-amber-400 mb-2">
        Dish not found
      </h2>
      <p className="text-neutral-400 mb-4 text-sm">
        We couldn&apos;t find that dish on our menu.
      </p>
      <Link href="/menu" className="text-amber-400 text-sm hover:underline">
        ← Back to Menu
      </Link>
    </div>
  );
}