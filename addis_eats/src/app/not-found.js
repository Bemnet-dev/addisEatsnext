import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-12 text-center">
      <h2 className="font-serif text-2xl text-amber-400 mb-2">
        Page not found
      </h2>
      <p className="text-neutral-400 mb-4 text-sm">
        That page doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="text-amber-400 text-sm hover:underline"
      >
        ← Back Home
      </Link>
    </div>
  );
}