"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { orders, addOrder } from "@/lib/orders";
import { getDishes } from "@/lib/dishes";
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

const ORDER_STATUSES = ["pending", "preparing", "delivering", "delivered", "cancelled"];

/**
 * Replaces every submitted line with the canonical dish from the menu.
 *
 * The browser only tells us "dish id + quantity"; name and price are always
 * taken from the server-side catalogue, so a hand-written request cannot buy
 * a 450 Birr doro wat for 1 Birr.
 */
async function normaliseOrderItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { kept: [], rejected: 0 };
  }

  const catalogue = new Map((await getDishes()).map((dish) => [dish.id, dish]));
  const kept = [];
  let rejected = 0;

  for (const item of items) {
    const dish = catalogue.get(item?.id);
    const qty = Math.floor(Number(item?.qty));
    if (!dish || !Number.isFinite(qty) || qty < 1) {
      rejected += 1;
      continue;
    }
    kept.push({ id: dish.id, name: dish.name, price: dish.price, qty });
  }

  return { kept, rejected };
}

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

  const { kept } = await normaliseOrderItems(raw.items);
  if (raw.items.length > 0 && kept.length === 0) {
    return {
      error: "Those cart items could not be matched to the menu. Refresh the page and try again.",
    };
  }
  raw.items = kept;

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

/**
 * Kitchen workflow: advance an order through its lifecycle.
 *
 * Three checks, in order, each one refusing a different caller:
 *   1. session      — signed out callers are refused here
 *   2. role         — a signed-in customer is refused here (authorisation,
 *                     not authentication: the check is on the ROLE, so a
 *                     customer session gets "Only kitchen staff…")
 *   3. existence    — unknown ids never mutate anything
 *
 * Called from /kitchen buttons and from window.updateOrderStatus in the
 * browser console (see src/app/ActionConsole.jsx).
 */
export async function updateOrderStatus(orderId, status) {
  const session = await getSession();
  if (!session) {
    return { error: "You must be signed in to update an order." };
  }

  if (session.role !== "staff") {
    return { error: "Only kitchen staff can update an order status." };
  }

  const nextStatus = typeof status === "string" ? status.trim() : "";
  if (!ORDER_STATUSES.includes(nextStatus)) {
    return { error: "Unknown order status." };
  }

  const order = orders.find((candidate) => candidate.id === orderId);
  if (!order) {
    return { error: "Order not found." };
  }

  order.status = nextStatus;
  revalidatePath("/orders");
  revalidatePath("/kitchen");
  return { success: true, status: order.status };
}