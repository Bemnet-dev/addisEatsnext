// Route-level Suspense boundary loading UI for /menu.
// Rendered on the server immediately while the page data + dynamic FilterShell
// chunk are fetched — prevents a blank screen and stabilises CLS.
export default function MenuLoading() {
  return (
    <div className="py-4">
      {/* Page header skeleton */}
      <div className="mb-8 border-b border-neutral-800 pb-6 space-y-3">
        <div className="h-3 w-28 animate-pulse rounded bg-neutral-800" />
        <div className="h-9 w-40 animate-pulse rounded bg-neutral-800" />
        <div className="h-4 w-72 animate-pulse rounded bg-neutral-800" />
      </div>

      {/* Search bar skeleton */}
      <div className="mb-6 h-[88px] animate-pulse rounded-md border border-neutral-800 bg-neutral-900/60" />

      {/* Category chips skeleton */}
      <div className="mb-6 flex gap-2">
        {[80, 96, 64, 80].map((w, i) => (
          <div
            key={i}
            style={{ width: w }}
            className="h-8 animate-pulse rounded-full border border-neutral-700 bg-neutral-900"
          />
        ))}
      </div>

      {/* Card grid skeleton — 4 cards matching PAGE_SIZE */}
      <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
        {[...Array(4)].map((_, i) => (
          <li
            key={i}
            className="h-72 animate-pulse rounded-md border border-neutral-800 bg-neutral-900/70"
          />
        ))}
      </ul>
    </div>
  );
}
