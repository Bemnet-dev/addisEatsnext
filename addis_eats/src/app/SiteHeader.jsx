"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/providers";
import MenuButton from "./MenuButton";
import NavLinks from "./NavLinks";

/**
 * Site header, client-side because it owns the open/closed state for the
 * mobile menu and reads cart state for the badge count.
 *
 * Layout passes the serialised session down from the server so auth stays a
 * server concern — this component only decides how to present it.
 */
export default function SiteHeader({ session }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { items } = useCart();
  const cartCount = items.reduce((sum, item) => sum + item.qty, 0);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/75">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          prefetch={false}
          onClick={closeMenu}
          className="font-serif text-lg font-bold text-amber-400"
        >
          Addis Eats
        </Link>

        {/* Desktop nav — always visible on md and up. */}
        <nav aria-label="Primary" className="hidden items-center gap-5 md:flex">
          <NavLinks session={session} />
        </nav>

        {/* Cart is a frequent destination, so it stays reachable on mobile
            next to the hamburger instead of hiding inside the panel. */}
        <div className="flex items-center gap-2">
          <Link
            href="/cart"
            prefetch={false}
            aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : "Cart"}
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-md border border-neutral-700 text-neutral-200 transition-colors hover:border-amber-400 hover:text-amber-300"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.55L21 8H6" />
              <circle cx="10" cy="20" r="1.25" />
              <circle cx="18" cy="20" r="1.25" />
            </svg>
            {cartCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[11px] font-bold text-neutral-950"
              >
                {cartCount}
              </span>
            )}
          </Link>

          <MenuButton open={menuOpen} onToggle={() => setMenuOpen((open) => !open)} />
        </div>
      </div>

      {/* Mobile panel — replaces the old always-visible row of links, which
          overflowed at ~320px. Hidden on md and up via `md:hidden`. */}
      {menuOpen ? (
        <div id="mobile-menu" className="border-t border-neutral-800 md:hidden">
          {session ? (
            <p className="break-words px-4 pt-3 text-xs uppercase tracking-[0.18em] text-emerald-400">
              {session.name} ({session.role})
            </p>
          ) : null}
          <nav aria-label="Mobile" className="flex flex-col gap-1 px-2 py-3">
            <NavLinks session={session} orientation="vertical" onNavigate={closeMenu} />
          </nav>
        </div>
      ) : null}
    </header>
  );
}
