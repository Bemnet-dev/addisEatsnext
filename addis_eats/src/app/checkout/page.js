import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import CheckoutForm from "./CheckoutForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Checkout",
  description: "Complete your Addis Eats order.",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const { session, redirectTo } = await requireSession("/checkout");
  if (redirectTo) redirect(redirectTo);

  return <CheckoutForm customerName={session.name} />;
}