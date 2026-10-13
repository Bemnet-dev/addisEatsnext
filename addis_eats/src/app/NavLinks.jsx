"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { signOut } from "@/app/actions";

const LINKS = [
  { href: "/menu", label: "Menu" },
  { href: "/orders", label: "Orders" },
  { href: "/checkout", label: "Checkout" },
];

// Server actions can't be called by name from the browser console, so the demo
// binds them to `window`. Importing them here (from a client component) keeps
// them in the browser bundle for that call site.
function isActive(pathname, href) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The navigation links, rendered identically inside the desktop bar and the
 * mobile hamburger panel.
 *
 * `onNavigate` lets the hamburger panel close itself when a link is tapped.
 * It is called from a client-side click handler (not `onClick` on the Link),
 * so the "use client" boundary and React's event system stay intact.
 */
export default function NavLinks({ session, onNavigate, orientation = "horizontal" }) {
  const pathname = usePathname();
  const isVertical = orientation === "vertical";

  // Close the panel on Escape and lock body scroll while it's open.
  useEffect(() => {
    if (!isVertical) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") onNavigate?.();
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isVertical, onNavigate]);

  const linkClass = isVertical
    ? "block rounded-md px-3 py-2.5 text-base transition-colors"
    : "rounded-md px-2 py-1 text-sm transition-colors";

  return (
    <>
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          prefetch={false}
          onClick={onNavigate}
          aria-current={isActive(pathname, link.href) ? "page" : undefined}
          className={`${linkClass} ${
            isActive(pathname, link.href)
              ? "text-amber-300"
              : isVertical
                ? "text-neutral-200 hover:text-amber-300"
                : "text-neutral-300 hover:text-amber-300"
          }`}
        >
          {link.label}
        </Link>
      ))}

      {session ? (
        <>
          {session.role === "staff" && (
            <Link
              href="/kitchen"
              prefetch={false}
              onClick={onNavigate}
              aria-current={isActive(pathname, "/kitchen") ? "page" : undefined}
              className={`${linkClass} ${
                isActive(pathname, "/kitchen")
                  ? "text-amber-300"
                  : isVertical
                    ? "text-neutral-200 hover:text-amber-300"
                    : "text-neutral-300 hover:text-amber-300"
              }`}
            >
              Kitchen
            </Link>
          )}
          <form action={signOut} className={isVertical ? "mt-2 pt-4" : ""}>
            <button
              type="submit"
              className={`${linkClass} w-full border border-neutral-700 text-left text-xs font-medium text-neutral-300 transition hover:border-amber-400 hover:text-amber-300`}
            >
              Sign out
            </button>
          </form>
        </>
      ) : (
        <Link
          href="/signin"
          prefetch={false}
          onClick={onNavigate}
          aria-current={isActive(pathname, "/signin") ? "page" : undefined}
          className={`${linkClass} ${
            isVertical
              ? "mt-2 border border-amber-400/80 text-center text-amber-300"
              : "border border-amber-400/80 text-amber-300"
          }`}
        >
          Sign in
        </Link>
      )}
    </>
  );
}
