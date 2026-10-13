import Image from "next/image";
import Link from "next/link";
import DishCard from "@/app/menu/DishCard";
import { getDishes, getDishDetailImage } from "@/lib/dishes";
import { toSlug } from "@/app/menu/slug";
import { CLOSES_AT_HOUR, OPENS_AT_HOUR } from "@/lib/hours";
import { absoluteUrl } from "@/lib/site";
import OpenStatus from "./home/OpenStatus";

export const metadata = {
  title: "Addis Eats — Authentic Ethiopian restaurant, menu & delivery",
  description:
    "Explore Addis Eats for fresh Ethiopian dishes, coffee, and street-food favorites.",
  alternates: {
    canonical: "/",
  },
};

// The root layout reads the session cookie, so this route renders per request
// (documented in DATA.md). That is what keeps the greeting and the "from" price
// below in sync with the catalogue instead of freezing them at build time.
export const revalidate = 3600;

/** Short blurbs per category — the dish descriptions stay on the cards. */
const CATEGORY_COPY = {
  Ethiopian: "Berbere, mitmita and teff injera — the food this kitchen is named for.",
  Pizza: "Stone-baked crusts, Ethiopian-spiced toppings, blistered edges.",
  Burgers: "Smashed patties, buttermilk-fried chicken, house sauces.",
  Drinks: "Jebena coffee, layered juices and honey tej.",
};

/** What to nudge a visitor towards, depending on Addis time of day. */
const TIME_OF_DAY = [
  {
    untilHour: 11,
    greeting: "Good morning",
    pitch: "Start with a jebena of Yirgacheffe, still warm from the roast.",
    dishId: "d11",
  },
  {
    untilHour: 16,
    greeting: "Good afternoon",
    pitch: "Lunch is better shared — a buna-free spread of wat and fresh injera.",
    dishId: "d1",
  },
  {
    untilHour: 22,
    greeting: "Good evening",
    pitch: "Dinner service: kitfo, shekla tibs and a table that stays a while.",
    dishId: "d4",
  },
  {
    untilHour: 24,
    greeting: "Late night",
    pitch: `The kitchen rests at ${CLOSES_AT_HOUR}:00 — order ahead for tomorrow.`,
    dishId: "d5",
  },
];

/** Current hour in the restaurant's timezone (Africa/Addis_Ababa). */
function addisHourNow() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Addis_Ababa",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  return Number(parts.find((part) => part.type === "hour")?.value ?? "0");
}

function greetingForHour(hour) {
  return TIME_OF_DAY.find((slot) => hour < slot.untilHour) ?? TIME_OF_DAY[TIME_OF_DAY.length - 1];
}

function groupByCategory(dishes) {
  const groups = new Map();

  for (const dish of dishes) {
    if (!groups.has(dish.category)) {
      groups.set(dish.category, []);
    }
    groups.get(dish.category).push(dish);
  }

  return [...groups.entries()].map(([category, items]) => ({
    category,
    items,
    // First dish in catalogue order — the kitchen's own pick for that section.
    signature: items[0],
    count: items.length,
    fromPrice: Math.min(...items.map((dish) => dish.price)),
  }));
}

const STEPS = [
  {
    title: "Pick your dishes",
    body: "Browse the menu by course, search by ingredient, and add anything to the cart.",
    href: "/menu",
    cta: "Open the menu",
  },
  {
    title: "We cook it fresh",
    body: "Orders land in the kitchen queue the second you place them — nothing sits under a heat lamp.",
    href: "/menu",
    cta: "Browse what's cooking",
  },
  {
    title: "Track it live",
    body: "Every order page updates as it moves from received to cooking to on its way.",
    href: "/orders",
    cta: "See order tracking",
  },
];

export default async function HomePage() {
  const dishes = await getDishes();
  const sections = groupByCategory(dishes);

  const now = addisHourNow();
  const slot = greetingForHour(now);
  const suggestedDish = dishes.find((dish) => dish.id === slot.dishId) ?? dishes[0];

  const heroDish = dishes.find((dish) => dish.id === "d1") ?? dishes[0];
  const signatureDishes = sections.map((section) => section.signature);
  const cheapest = Math.min(...dishes.map((dish) => dish.price));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: "Addis Eats",
    servesCuisine: "Ethiopian",
    priceRange: `${cheapest}–${Math.max(...dishes.map((dish) => dish.price))} Br`,
    url: absoluteUrl("/"),
    menu: absoluteUrl("/menu"),
    address: {
      "@type": "PostalAddress",
      addressLocality: "Addis Ababa",
      addressCountry: "ET",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        opens: `${String(OPENS_AT_HOUR).padStart(2, "0")}:00`,
        closes: `${String(CLOSES_AT_HOUR).padStart(2, "0")}:00`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="space-y-16 py-4">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">
              {slot.greeting} from Addis · authentic Ethiopian kitchen
            </p>
            <h1 className="font-serif text-4xl leading-tight text-amber-300 sm:text-5xl">
              Slow-cooked wat, fresh injera, and coffee roasted the same day.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-neutral-300">
              {slot.pitch} Everything on this page comes straight from the kitchen&apos;s
              catalogue — {dishes.length} dishes across {sections.length} courses, ready to
              order for delivery.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/menu"
                prefetch={false}
                className="rounded-md bg-amber-400 px-6 py-3 text-sm font-semibold text-neutral-950 transition-colors hover:bg-amber-300"
              >
                Order from the menu
              </Link>
              <Link
                href="#signature-picks"
                className="rounded-md border border-neutral-700 px-6 py-3 text-sm font-semibold text-neutral-200 transition-colors hover:border-amber-300 hover:text-amber-300"
              >
                See signature picks
              </Link>
              <OpenStatus />
            </div>
          </div>

          {/* Priority image — the LCP element on this page, so it uses the
              pre-cropped 900×506 detail WebP (~46 kB) rather than the full photo. */}
          <div className="overflow-hidden rounded-xl border border-neutral-800">
            <Image
              src={getDishDetailImage(heroDish.image)}
              alt={`Photo of ${heroDish.name}`}
              width={900}
              height={506}
              unoptimized
              priority
              fetchPriority="high"
              className="aspect-[16/9] w-full bg-neutral-800 object-cover"
            />
          </div>
        </section>

        {/* ── Facts, derived from the catalogue ─────────────────── */}
        <section aria-label="At a glance" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { value: `${dishes.length}`, label: "dishes on the menu" },
            { value: `${sections.length}`, label: "courses to explore" },
            { value: `from ${cheapest} Br`, label: "cheapest plate" },
            { value: "Live", label: "order status tracking" },
          ].map((fact) => (
            <div
              key={fact.label}
              className="rounded-md border border-neutral-800 bg-neutral-900/60 p-4"
            >
              <p className="font-serif text-2xl text-amber-300">{fact.value}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-400">
                {fact.label}
              </p>
            </div>
          ))}
        </section>

        {/* ── Courses ──────────────────────────────────────────── */}
        <section aria-labelledby="courses-heading" className="space-y-6">
          <div className="border-b border-neutral-800 pb-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">
              Cooked to order
            </p>
            <h2 id="courses-heading" className="font-serif text-3xl text-amber-300">
              Browse by course
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-400">
              Each course below is generated from the live menu, so a dish added in the
              kitchen shows up here on the next request.
            </p>
          </div>

          <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
            {sections.map((section) => (
              <li key={section.category} className="min-w-0">
                <Link
                  href="/menu"
                  prefetch={false}
                  className="group flex h-full items-center gap-4 rounded-md border border-neutral-800 bg-neutral-900/70 p-4 transition-colors hover:border-emerald-500/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  <Image
                    src={section.signature.image}
                    alt={`Photo of ${section.signature.name}`}
                    width={512}
                    height={288}
                    unoptimized
                    className="aspect-[16/9] w-28 shrink-0 rounded-md bg-neutral-800 object-cover"
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-emerald-500">
                      {section.count} {section.count === 1 ? "dish" : "dishes"} · from{" "}
                      {section.fromPrice} Br
                    </span>
                    <strong className="mt-1 block font-serif text-xl font-medium text-neutral-100 transition-colors group-hover:text-amber-300">
                      {section.category}
                    </strong>
                    <span className="mt-1 block text-sm leading-6 text-neutral-400">
                      {CATEGORY_COPY[section.category] ?? "House favourites, cooked to order."}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Signature picks ──────────────────────────────────── */}
        <section aria-labelledby="signature-heading" className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-800 pb-5">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">
                One from each course
              </p>
              <h2 id="signature-heading" className="font-serif text-3xl text-amber-300">
                Signature picks
              </h2>
            </div>
            <Link
              href="/menu"
              prefetch={false}
              className="text-sm text-amber-400 transition-colors hover:text-amber-300 hover:underline"
            >
              View all {dishes.length} dishes →
            </Link>
          </div>

          <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
            {signatureDishes.map((dish) => (
              <DishCard key={dish.id} dish={dish} />
            ))}
          </ul>
        </section>

        {/* ── How it works ─────────────────────────────────────── */}
        <section aria-labelledby="how-heading" className="space-y-6">
          <div className="border-b border-neutral-800 pb-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">
              Order to table
            </p>
            <h2 id="how-heading" className="font-serif text-3xl text-amber-300">
              How ordering works
            </h2>
          </div>

          <ol className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="flex flex-col rounded-md border border-neutral-800 bg-neutral-900/70 p-5"
              >
                <span className="font-serif text-3xl text-amber-300" aria-hidden="true">
                  {index + 1}
                </span>
                <strong className="mt-3 font-serif text-lg font-medium text-neutral-100">
                  {step.title}
                </strong>
                <p className="mt-2 flex-1 text-sm leading-6 text-neutral-400">{step.body}</p>
                <Link
                  href={step.href}
                  prefetch={false}
                  className="mt-4 text-sm text-amber-400 transition-colors hover:text-amber-300 hover:underline"
                >
                  {step.cta} →
                </Link>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Closing band ─────────────────────────────────────── */}
        <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-8 text-center">
          <h2 className="font-serif text-3xl text-amber-300">
            Hungry? The injera is already rolled.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-neutral-400">
            Suggested for this hour:{" "}
            <strong className="font-medium text-neutral-200">{suggestedDish.name}</strong> —{" "}
            {suggestedDish.description}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/menu"
              prefetch={false}
              className="rounded-md bg-amber-400 px-6 py-3 text-sm font-semibold text-neutral-950 transition-colors hover:bg-amber-300"
            >
              Start an order
            </Link>
            <Link
              href={`/menu/${toSlug(suggestedDish.name)}`}
              prefetch={false}
              className="rounded-md border border-neutral-700 px-6 py-3 text-sm font-semibold text-neutral-200 transition-colors hover:border-amber-300 hover:text-amber-300"
            >
              {suggestedDish.name} · {suggestedDish.price} Br
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
