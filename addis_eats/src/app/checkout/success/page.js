import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrderById } from "@/lib/orders";
import { requireSession } from "@/lib/session";
import ClearCartOnMount from "./ClearCartOnMount";

export const metadata = {
  title: "Order placed",
  description: "Your Addis Eats order was received — follow its live status in Order tracker.",
  robots: { index: false, follow: false },
};

export default async function CheckoutSuccessPage({ searchParams }) {
  // Page layer: middleware already refuses unsigned callers, this re-verifies
  // the session independently before anything on the page is rendered.
  const { session, redirectTo } = await requireSession("/checkout/success");
  if (redirectTo) redirect(redirectTo);

  const { id } = await searchParams;

  // Ownership layer: if an order id is present, it must be the viewer's own
  // (staff may view any). Changing the id in the URL yields a 404, not data.
  if (typeof id === "string" && id.length > 0) {
    const order = getOrderById(id);
    if (!order || (session.role !== "staff" && order.customerName !== session.name)) {
      notFound();
    }
  }

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
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href={typeof id === "string" && id ? `/orders/${id}` : "/orders"}
          className="inline-block px-6 py-3 border border-amber-400 text-amber-400 rounded hover:bg-amber-400 hover:text-neutral-900 transition-colors"
        >
          Track this order
        </Link>
        <Link
          href="/menu"
          className="inline-block px-6 py-3 border border-neutral-700 text-neutral-300 rounded hover:border-amber-400 hover:text-amber-300 transition-colors"
        >
          Back to Menu
        </Link>
      </div>
    </div>
  );
}
