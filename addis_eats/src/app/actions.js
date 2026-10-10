"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { orders, addOrder } from "@/lib/orders";
import { orderSchema } from "@/lib/schema";
import {
  clearSession,
  getSession,
  sanitizeNextPath,
  setSession,
} from "@/lib/session";

const DEMO_ACCOUNTS = [
  { name: "Abebe Kebede", password: "addis123", role: "customer" },
  { name: "Kitchen Staff", password: "kitchen123", role: "staff" },
];

export async function signIn(prevState, formData) {
  const customerName = String(formData.get("customerName") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = sanitizeNextPath(formData.get("next")?.toString());

  if (!customerName || !password) {
    return {
      fieldErrors: {
        customerName: !customerName ? ["Please enter your name."] : undefined,
        password: !password ? ["Please enter your password."] : undefined,
      },
    };
  }

  const account = DEMO_ACCOUNTS.find(
    (candidate) => candidate.name === customerName && candidate.password === password
  );
  if (!account) {
    return {
      error: "Invalid credentials. Use the demo account shown on the page.",
    };
  }

  await setSession({ name: account.name, role: account.role });
  redirect(next);
}

export async function signOut() {
  await clearSession();
  redirect("/signin");
}

export async function placeOrder(prevState, formData) {
  const session = await getSession();
  if (!session) {
    return { error: "Please sign in before placing an order." };
  }

  const raw = {
    customerName: formData.get("customerName"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    items: (() => {
      try {
        return JSON.parse(formData.get("items") || "[]");
      } catch {
        return [];
      }
    })(),
  };

  raw.customerName = session.name;
  const parsed = orderSchema.safeParse(raw);

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const order = addOrder({ ...parsed.data, status: "pending" });
  revalidatePath("/orders");
  redirect(`/checkout/success?id=${order.id}`);
}

export async function cancelOrder(orderId) {
  const session = await getSession();

  if (!session) {
    return { error: "You must be signed in to cancel an order." };
  }

  const order = orders.find((o) => o.id === orderId);
  if (!order) {
    return { error: "Order not found." };
  }
  if (session.role !== "staff" && order.customerName !== session.name) {
    return { error: "You don't own this order." };
  }

  order.status = "cancelled";
  revalidatePath("/orders");
  return { success: true };
}