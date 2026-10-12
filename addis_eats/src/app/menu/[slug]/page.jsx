import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getDishDetailImage, getDishes } from "@/lib/dishes";
import { absoluteUrl } from "@/lib/site";
import { toSlug } from "../slug";
import AddToCartButton from "../AddToCartButton";

// Dimensions of the pre-cropped detail WebP files in /public/dishes/display/detail/
const OG_IMAGE_WIDTH = 900;
const OG_IMAGE_HEIGHT = 506;

/**
 * Return the absolute URL for the dish's OG image.
 *
 * We use the pre-generated JPEG files in /public/og/dishes/ rather than
 * /_next/image because:
 *   - /_next/image respects the browser's Accept header and serves WebP to
 *     most clients — but social crawlers (Facebook, WhatsApp, Telegram, iMessage)
 *     don't reliably support WebP and may show a broken or missing preview.
 *   - Static JPEGs in /public are served as-is with a Content-Type of image/jpeg,
 *     which every crawler understands with no negotiation.
 *
 * File naming: /public/og/dishes/<slug>.jpg  (e.g. special-doro-wat.jpg)
 * These are committed to git and deployed alongside the app.
 */
function getOgImageUrl(slug) {
  return absoluteUrl(`/og/dishes/${slug}.jpg`);
}

export async function generateStaticParams() {
  const dishes = await getDishes();
  return dishes.map((dish) => ({ slug: toSlug(dish.name) }));
}

export async function generateMetadata({ params }, parent) {
  const { slug } = await params;
  const dishes = await getDishes();
  const dish = dishes.find((d) => toSlug(d.name) === slug);

  if (!dish) {
    return parent;
  }

  const description = `${dish.name} — ${dish.description}`;
  // Static JPEG in /public/og/dishes/<slug>.jpg — served as plain image/jpeg,
  // which every social crawler (Facebook, WhatsApp, Telegram) can display.
  const imageUrl = getOgImageUrl(slug);

  return {
    title: dish.name,
    description,
    alternates: {
      canonical: `/menu/${slug}`,
    },
    openGraph: {
      type: "article",
      url: absoluteUrl(`/menu/${slug}`),
      title: `${dish.name} | Addis Eats`,
      description,
      images: [
        {
          url: imageUrl,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          alt: `${dish.name} from Addis Eats`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${dish.name} | Addis Eats`,
      description,
      images: [imageUrl],
    },
  };
}

export default async function DishPage({ params }) {
  const { slug } = await params;
  const dishes = await getDishes();

  const dish = dishes.find((d) => toSlug(d.name) === slug);

  if (!dish) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MenuItem",
    name: dish.name,
    description: dish.description,
    image: absoluteUrl(dish.image),
    category: dish.category,
    offers: {
      "@type": "Offer",
      priceCurrency: "ETB",
      price: String(dish.price),
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-3xl">
        {/* Dish image — priority because it's the LCP element on this page */}
        <div className="mb-8 overflow-hidden rounded-xl border border-neutral-800">
          <Image
            src={getDishDetailImage(dish.image)}
            alt={`Photo of ${dish.name}`}
            width={900}
            height={506}
            unoptimized
            priority
            fetchPriority="high"
            className="aspect-[16/9] w-full object-cover bg-neutral-800"
          />
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
          {dish.category}
        </p>
        <h1 className="font-serif text-4xl text-amber-300 mb-3">
          {dish.name}
        </h1>
        <p className="mb-6 text-2xl font-semibold text-amber-300">{dish.price} Birr</p>
        <p className="mb-8 max-w-xl text-base leading-7 text-neutral-300">
          {dish.description}
        </p>

        <AddToCartButton dish={dish} />

        <div className="mt-8">
          <Link href="/menu" prefetch={false} className="text-amber-400 text-sm hover:underline">
            ← Back to Menu
          </Link>
        </div>
      </div>
    </>
  );
}