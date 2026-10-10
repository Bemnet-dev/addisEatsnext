"use client";

import { useEffect } from "react";
import { cancelOrder, updateOrderStatus } from "@/app/actions";

/**
 * Demo affordance for the Day 45 verification script.
 *
 * The brief asks students to run the three attacks from the browser console:
 *
 *   await cancelOrder("<someone else's order id>")
 *   await updateOrderStatus("<order id>", "delivered")
 *
 * Server Actions are not reachable by name from the console (they are only
 * wired to the call sites that import them), so this binds the two mutating
 * actions to `window` where they can be called directly.
 *
 * This grants no extra power: both actions re-check session and ownership on
 * the server before mutating anything, exactly as they do when called from a
 * button. Removing this file only makes the demo harder to run.
 */
export default function ActionConsole() {
  useEffect(() => {
    window.cancelOrder = cancelOrder;
    window.updateOrderStatus = updateOrderStatus;

    return () => {
      delete window.cancelOrder;
      delete window.updateOrderStatus;
    };
  }, []);

  return null;
}
