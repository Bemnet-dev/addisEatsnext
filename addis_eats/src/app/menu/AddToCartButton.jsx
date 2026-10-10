"use client";

import { useCart } from "@/lib/providers";
import { useState } from "react";

export default function AddToCartButton({ dish }) {
  const { addToCart } = useCart();
  const [added, setAdded] = useState(false);

  const handleClick = () => {
    addToCart(dish);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="px-6 py-3 bg-amber-400 text-neutral-900 font-semibold rounded hover:bg-amber-500 transition-colors"
    >
      {added ? "Added ✓" : "+ Add to Order"}
    </button>
  );
}