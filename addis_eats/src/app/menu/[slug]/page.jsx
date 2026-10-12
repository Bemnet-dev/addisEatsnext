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
 * Build a /_next/image URL that serves the dish photo as JPEG/PNG.
 * Social crawlers (Facebook, WhatsApp, Telegram) do not support WebP as og:image.
 * The Next.js Image Optimization endpoint transcodes to a widely-supported format
 * and the crawler gets a real photo rather than a broken image or fallback card.
 *
 * w=900 matches the source dimensions; q=85 keeps file size reasonable.
 */
function getOgImageUrl(publicPath) {
  const encoded = encodeURIComponent(publicPath);
  return absoluteUrl(`/_next/image?url=${encoded}&w=900&q=85`);
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
  // Use the real dish photo via Next.js image optimization (/_next/image).
  // Crawlers (Facebook, WhatsApp, Telegram) do not support WebP as og:image,
  // but /_next/image transcodes the WebP to JPEG on demand so they get a real
  // food photo instead of a generated text card or a broken preview.
  const imageUrl = getOgImageUrl(getDishDetailImage(dish.image));

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