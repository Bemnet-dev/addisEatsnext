import { z } from "zod";

export const orderSchema = z.object({
  customerName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .regex(
      /^[a-zA-Z\s\u00C0-\u024F\u1200-\u137F'-]+$/,
      "Please enter a valid name (letters only, no numbers)"
    ),
  phone: z
    .string()
    .regex(/^(?:\+251|0)[79]\d{8}$/, "Enter a valid Ethiopian number"),
  address: z
    .string()
    .min(4, "Address is required")
    .regex(
      /[a-zA-Z]/,
      "Please enter a real address, not just numbers"
    ),
  items: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        price: z.number().positive(),
        qty: z.number().int().positive(),
      })
    )
    .min(1, "Cart is empty"),
});