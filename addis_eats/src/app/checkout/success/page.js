import Link from "next/link";
import ClearCartOnMount from "./ClearCartOnMount";

export default async function CheckoutSuccessPage({ searchParams }) {
  const { id } = await searchParams;

  return (
    <div className="max-w-2xl text-center py-12">
      <ClearCartOnMount />

      <h1 className="font-serif text-4xl text-amber-400 mb-4">
        Thank You
      </h1>
      <p className="text-neutral-400 mb-2">
        Your order has been placed.
      </p>
      {id && (
        <p className="text-neutral-500 text-sm mb-8">
          Order ID: <span className="text-amber-400">{id}</span>
        </p>
      )}
      <Link
        href="/menu"
        className="inline-block px-6 py-3 border border-amber-400 text-amber-400 rounded hover:bg-amber-400 hover:text-neutral-900 transition-colors"
      >
        Back to Menu
      </Link>
    </div>
  );
}