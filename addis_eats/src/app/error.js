"use client";

export default function Error({ error, reset }) {
  return (
    <div className="py-12 text-center">
      <h2 className="font-serif text-2xl text-amber-400 mb-2">
        Something went wrong
      </h2>
      <p className="text-neutral-400 mb-4 text-sm">
        {error.message}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="px-4 py-2 border border-amber-400 text-amber-400 rounded hover:bg-amber-400 hover:text-neutral-900 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}