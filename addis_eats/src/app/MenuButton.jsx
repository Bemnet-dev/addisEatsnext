"use client";

/**
 * Hamburger toggle, rendered only on small screens (the desktop bar hides it).
 * `aria-expanded` and `aria-controls` wire it to the panel for screen readers.
 */
export default function MenuButton({ open, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls="mobile-menu"
      aria-label={open ? "Close menu" : "Open menu"}
      className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-neutral-700 text-neutral-200 transition-colors hover:border-amber-400 hover:text-amber-300 md:hidden"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      >
        {open ? (
          <>
            <path d="M6 6l12 12" />
            <path d="M18 6L6 18" />
          </>
        ) : (
          <>
            <path d="M4 7h16" />
            <path d="M4 12h16" />
            <path d="M4 17h16" />
          </>
        )}
      </svg>
    </button>
  );
}
