import CheckoutForm from "./CheckoutForm";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Checkout",
  description: "Complete your Addis Eats order.",
};

export default async function CheckoutPage() {
  const { session, redirectTo } = await requireSession("/checkout");
  if (redirectTo) redirect(redirectTo);

  return <CheckoutForm customerName={session.name} />;
}