"use client";

export default function CategoryBar({ categories, active = "All", onSelect }) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Menu categories">
      {categories.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => onSelect?.(cat)}
          aria-pressed={active === cat}
          className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${active === cat
              ? "border-amber-300 bg-amber-300 text-neutral-950"
              : "border-neutral-700 bg-neutral-900/70 text-neutral-300 hover:border-emerald-400 hover:text-emerald-300"
            }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}