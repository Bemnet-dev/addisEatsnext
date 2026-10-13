# Technical Design — OG Images, Mobile Responsiveness & Interactive Landing Page
## Revision 2 — addresses all review findings

> **Before writing any code**, consult `node_modules/next/dist/docs/` for any API differences in this version of Next.js (v16.3.5), as required by AGENTS.md. This is a non-standard version with potentially breaking changes from public documentation.

---

## Overview

This is a Next.js 16.3.5 (non-standard version — check in-repo docs) app using React 19, Tailwind CSS v4 (via `@tailwindcss/postcss`), and the App Router. The colour palette is overridden in `globals.css` via `@theme inline`. **Critical:** the `neutral` and `amber` scales do not match Tailwind defaults:

```
neutral-950 = #ffffff   (white)
neutral-900 = #f5f8f6   (near-white)
neutral-800 = #e2e8e4
neutral-700 = #c6d0ca
neutral-500 = #637169
neutral-400 = #526159   (dark muted green)
neutral-300 = #3f4d45
neutral-200 = #2e3a32   (dark forest green)
neutral-100 = #17211b   (near-black)
amber-300   = #15803d   (dark green — SAME as amber-400)
amber-400   = #15803d   (dark green — same as amber-300)
amber-500   = #166534   (darker green)
emerald-400 = #0284c7   (blue)
```

Any colour chosen for foreground text must be checked against the actual hex values above, not assumed from Tailwind's standard colour names. All Tailwind class names used in this design are verified against these overrides.

The tech stack is locked: Next.js App Router, Tailwind v4 utility classes, no new npm packages.

---

## Feature 1 — Per-Dish OpenGraph Images

### Finding

`generateMetadata` is **already fully implemented** in `src/app/menu/[slug]/page.jsx`. It exports correct `openGraph.images` pointing to `absoluteUrl(/og/dishes/${slug}.jpg)` with `twitter.card = "summary_large_image"`. The `toSlug()` function in `src/app/menu/slug.js` produces values byte-identical to the OG JPEG basenames for all 13 dishes.

### Key clarification on title vs og:title

The existing `generateMetadata` sets two separate fields:
- `title: dish.name` — the HTML `<title>` tag; the layout's template (`"%s | Addis Eats"`) auto-appends the suffix, producing `"Special Doro Wat | Addis Eats"`.
- `openGraph.title: \`${dish.name} | Addis Eats\`` — the OG meta tag; includes the full suffix explicitly.

**Do not modify the `title` field.** The layout template handles the suffix. Only `openGraph.title` carries the full suffix. Changing `title` to include the suffix would cause double-appending: `"Special Doro Wat | Addis Eats | Addis Eats"`.

### Implementation action

No code changes are needed. The implementer must run `npm run build` and confirm no build error touches `src/app/menu/[slug]/page.jsx`. Verify OG output for at least `special-doro-wat` and `traditional-buna-ethiopian-coffee`.

---

## Feature 2 — Mobile Responsiveness

### Tailwind v4 context

`globals.css` redefines colour scales via `@theme inline`. This design uses only class names that already appear in the codebase, with one addition: `min-h-[44px]` for tap targets. No `theme()` function calls or new `extend` blocks are needed.

### 2a — Root layout header (`src/app/layout.js`)

**Problem:** The header `<nav>` is a flat `flex` row with `gap-6`. On 320–640 px viewports this overflows horizontally.

**Solution:** Extract a `"use client"` island `src/app/MobileNav.jsx`. The layout server component renders `<MobileNav>` in place of the inline `<nav>`.

#### MobileNav architecture

`MobileNav` is a client component. It can import the `signOut` Server Action **directly** from `@/app/actions` — the in-repo Next.js docs (`use-server.md`) confirm that client components can import and call Server Actions from dedicated `"use server"` files. Passing it as a prop is unnecessary and complicates the props interface. Final props:

```
Props: { session: { name: string; role: string } | null }
```

`signOut` is imported directly inside `MobileNav.jsx` from `@/app/actions`.

#### MobileNav structure

```jsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { signOut } from "@/app/actions";

export default function MobileNav({ session }) {
  const [open, setOpen] = useState(false);
  // ...hamburger toggle button (sm:hidden, min 44×44 px tap target)
  // ...full-width dropdown nav (visible when open, hidden when !open, sm:hidden)
  // ...desktop nav (hidden on mobile, sm:flex)
}
```

Mobile dropdown: `absolute top-full left-0 right-0 z-50 bg-neutral-950 border-b border-neutral-800`. Each nav link gets `block py-3 px-6 text-base` (≥44 px tap height). The hamburger button gets `p-2.5` giving a 44 × 44 px touch area (2.5 × 4 × 4 = 40 px padding; at base font-size the SVG icon is 24 px; total interactive area is 44 px with padding).

Desktop: links display as `hidden sm:flex items-center gap-6 text-sm` (matching current behaviour).

The sign-out `<form action={signOut}>` renders inside both the mobile dropdown (with `block py-3 px-6` button) and the desktop view (existing `px-3 py-1.5` button), matching current layout.

**Layout changes in `src/app/layout.js`:**
- Header outer `<div>`: `px-8 py-4` → `px-4 py-3 sm:px-8 sm:py-4`
- `<main>`: `p-8` → `p-4 sm:p-6 lg:p-8`
- Replace the inline `<nav>` and sign-in link with `<MobileNav session={session} />`

### 2b — Menu page filter shell (`src/app/menu/FilterShell.jsx`)

**Fix 1 — Sort/count row overflow:** The outer `<div className="flex flex-wrap items-center justify-between gap-4 border-b ...">` squeezes its two children at 320 px. Change to:
```jsx
<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-4 border-b border-neutral-800 pb-4 text-sm text-neutral-400">
```
This stacks count and sort vertically on mobile, horizontally from sm up.

**Fix 2 — Sort select min-width:** Inside the sort `<label>`, add `min-w-0` to the `<select>` to prevent it from expanding beyond the label's flex bounds on narrow screens.

**Fix 3 — Search input iOS zoom:** Change the search `<input>` from `text-sm` to `text-base sm:text-sm`. iOS Safari auto-zooms inputs with font-size < 16 px (14 px = `text-sm`) — `text-base` (16 px) prevents this.

### 2c — Category bar (`src/app/menu/CategoryBar.jsx`)

**Problem:** Pills wrap into multiple rows on narrow viewports, which can push content below the fold. On very narrow screens (320 px) with many categories this wastes vertical space.

**Fix:** Change `flex flex-wrap gap-2` to `flex gap-2 overflow-x-auto pb-1 scrollbar-none`. Add `shrink-0` and `min-h-[44px]` to each `<button>`.

The `scrollbar-none` utility must be registered with Tailwind v4's `@utility` syntax (not a plain CSS class), otherwise the JIT engine may not recognize it. Add to `globals.css`:

```css
@utility scrollbar-none {
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}
```

Complete button class after fix: `shrink-0 min-h-[44px] rounded-md border px-4 py-2 text-sm font-medium transition-colors ...`

### 2d — Dish detail page (`src/app/menu/[slug]/page.jsx`)

**Fix:** `<h1>` uses `text-4xl` with no responsive fallback. On 320 px this clips. Change to `text-3xl sm:text-4xl`. No other changes needed — `max-w-3xl`, `w-full`, `aspect-[16/9]`, and relative font sizes are already correct. `AddToCartButton` has `px-6 py-3` giving ≥44 px height.

### 2e — Cart page (`src/app/cart/CartItems.jsx`)

**Problem:** Cart `<li>` items use `flex justify-between` — on narrow screens a long dish name and the price+Remove cluster may overflow or clip.

**Fix:** Change `<li>` layout to stack on mobile:
```jsx
<li className="flex flex-col gap-1 py-3 border-b border-neutral-800 sm:flex-row sm:items-center sm:justify-between">
```
Name `<div>`: add `min-w-0` to allow text to wrap. Price+button `<div>`: `flex items-center gap-3 self-start sm:self-auto`. Remove `<button>`: add `min-h-[44px] px-2` to reach 44 px tap target.

"Proceed to Checkout" `<Link>`: the existing `inline-block px-6 py-3` already meets the 44 px tap target requirement (py-3 = 12 px × 2 + text ≈ 44 px). The following is an **optional UX enhancement** only, not a required fix: `block w-full text-center py-3 sm:inline-block sm:w-auto`.

### 2f — Checkout form (`src/app/checkout/CheckoutForm.jsx`)

**Fix:** All `<input>` elements use `text-sm` (14 px). iOS Safari auto-zooms inputs below 16 px. Change to `text-base sm:text-sm` on all three `<input>` fields (phone, address) and the `<p>` showing the customer name can stay as-is (it's non-interactive). No other changes needed: `w-full` and `w-full py-3` on the submit button are already correct.

### File change summary for Feature 2

| File | Change |
|------|--------|
| `src/app/layout.js` | Reduce padding on header and main; render `<MobileNav>` |
| `src/app/MobileNav.jsx` | **New** — `"use client"` hamburger/nav island |
| `src/app/globals.css` | Add `@utility scrollbar-none`, `@keyframes` (Feature 3) |
| `src/app/menu/CategoryBar.jsx` | Horizontal scroll, `shrink-0`, `min-h-[44px]` on pills |
| `src/app/menu/FilterShell.jsx` | Sort/count row `flex-col` on mobile; `min-w-0` on select; `text-base` on search input |
| `src/app/menu/[slug]/page.jsx` | `text-3xl sm:text-4xl` on `<h1>` |
| `src/app/cart/CartItems.jsx` | Wrap `<li>` on mobile; `min-h-[44px]` on Remove; optional full-width checkout link |
| `src/app/checkout/CheckoutForm.jsx` | `text-base sm:text-sm` on inputs |

---

## Feature 3 — Interactive Landing Page

### Colour verification for the landing page

Before specifying any class, verified against `globals.css`:

| Need | Class | Hex |
|------|-------|-----|
| Page background | `bg-neutral-950` | `#ffffff` (white) |
| Hero section bg | `bg-neutral-900` | `#f5f8f6` (near-white) |
| Headline text (must be dark on near-white bg) | `text-neutral-100` | `#17211b` (near-black ✓ high contrast) |
| Sub-headline text | `text-neutral-300` | `#3f4d45` (dark muted ✓) |
| Badge text on light bg | `text-amber-500` | `#166534` (dark green on near-white ✓) |
| CTA button bg | `bg-amber-400` | `#15803d` (dark green) |
| CTA button text | `text-neutral-950` | `#ffffff` (white on dark green ✓) |
| CTA hover (must differ from `amber-400`) | `hover:bg-amber-500` | `#166534` (slightly darker green ✓) |
| Category badge on card | `text-emerald-400` | `#0284c7` (blue — matches menu page) |
| Card border on hover | `hover:border-emerald-500` | `#38bdf8` (lighter blue — matches `DishCard.jsx`) |

`amber-300 = amber-400 = #15803d` — **never use `hover:bg-amber-300`** for hover states; it produces no visible change. All CTA hover states use `hover:bg-amber-500`.

### Architecture decision

The new `page.js` is an `async` Server Component — `getDishes()` is `async function getDishes()` in `src/lib/dishes.js` and must be awaited. No top-level `"use client"`. All hover effects are implemented via Tailwind `group-hover:` utilities (CSS-only, no JS). No client island is needed.

The hero is **contained** within the root layout's `max-w-6xl` wrapper — no negative-margin bleed, no `overflow: hidden` changes to the layout. The hero uses a gradient background that fills its bounded section. This is simpler and avoids cross-breakpoint overflow risks.

### Imports in `page.js`

```js
import Link from "next/link";
import Image from "next/image";
import { getDishes, getDishCardImage } from "@/lib/dishes";
import { toSlug } from "./menu/slug";
```

`getDishCardImage` transforms `/dishes/<name>.webp` → `/dishes/display/card/<name>.webp`. All four featured card images are confirmed present in `public/dishes/display/card/`.

### Curated featured dishes

Selected by filtering `await getDishes()` on IDs `["d1", "d8", "d9", "d11"]`:

| ID  | Name | Category |
|-----|------|----------|
| d1  | Special Doro Wat | Ethiopian |
| d8  | Addis Gourmet Double Smash | Burgers |
| d9  | Crispy Zesty Chicken Burger | Burgers |
| d11 | Traditional Buna (Ethiopian Coffee) | Drinks |

```js
export default async function HomePage() {
  const allDishes = await getDishes();
  const featuredIds = ["d1", "d8", "d9", "d11"];
  const featuredDishes = allDishes.filter((d) => featuredIds.includes(d.id));
  // ...
}
```

### Keyframe animations (`globals.css`)

Three `@keyframes` are added at the root CSS level (outside `@theme`). Tailwind v4 supports arbitrary animation syntax `animate-[name_duration_delay_easing_fill-mode]`. The 5-token order matches the CSS `animation` shorthand: **name · duration · delay · timing-function · fill-mode**.

```css
/* Landing page entrance animations — used via Tailwind arbitrary animation syntax:
   animate-[fadeInDown_0.6s_0s_ease_both]
   Token order: name · duration · delay · timing-function · fill-mode */
@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-16px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

### Hero section

Background: `bg-neutral-900` (`#f5f8f6`, near-white light grey) — gives readable dark text on light background. A subtle radial gradient overlay (`from-amber-400/5`) adds warmth without changing the dominant colour.

```jsx
<section className="relative flex min-h-[70vh] flex-col items-center justify-center
                    rounded-2xl overflow-hidden bg-neutral-900 py-16 px-6 text-center
                    sm:py-24">
  {/* decorative gradient — pointer-events-none so it doesn't block clicks */}
  <div className="absolute inset-0 bg-gradient-to-br from-amber-400/5 via-transparent
                  to-emerald-500/5 pointer-events-none" aria-hidden="true" />

  {/* category badge */}
  <p className="relative z-10 mb-4 inline-flex items-center gap-2 rounded-full
                bg-amber-400/15 px-4 py-1.5 text-xs font-semibold uppercase
                tracking-[0.2em] text-amber-500
                animate-[fadeInDown_0.6s_0s_ease_both]">
    Addis, served fresh
  </p>

  {/* headline — text-neutral-100 = #17211b (near-black) on #f5f8f6 (near-white) ✓ */}
  <h1 className="relative z-10 font-serif text-5xl font-bold text-neutral-100
                 leading-tight max-w-xl sm:text-6xl lg:text-7xl
                 animate-[fadeInDown_0.7s_0.1s_ease_both]">
    Taste of Addis
  </h1>

  {/* subheadline — text-neutral-300 = #3f4d45 (readable on #f5f8f6) ✓ */}
  <p className="relative z-10 mt-6 max-w-lg text-lg text-neutral-300 leading-relaxed
                animate-[fadeInDown_0.7s_0.2s_ease_both]">
    Authentic Ethiopian flavours — doro wat, kitfo, fresh juices, and ceremonial coffee.
    Order online, delivered fast.
  </p>

  {/* CTA — bg-amber-400 (#15803d dark green) + text-neutral-950 (white) ✓
            hover:bg-amber-500 (#166634) — visibly darker, not identical ✓ */}
  <Link href="/menu"
    className="relative z-10 mt-10 inline-flex items-center gap-2 rounded-full
               bg-amber-400 px-8 py-4 text-base font-semibold text-neutral-950
               transition-all duration-200 hover:bg-amber-500 hover:scale-105
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400
               animate-[fadeInUp_0.6s_0.3s_ease_both]">
    Explore the Menu →
  </Link>
</section>
```

### Featured dishes section

```jsx
<section className="py-16">
  <div className="mb-10 text-center">
    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
      House favourites
    </p>
    <h2 className="font-serif text-3xl text-neutral-100 sm:text-4xl">
      Crowd Pleasers
    </h2>
  </div>

  {/* single-column on mobile, 2-col on sm, 4-col on lg — mobile-first */}
  <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
    {featuredDishes.map((dish, index) => (
      <FeaturedDishCard key={dish.id} dish={dish} priority={index === 0} />
    ))}
  </ul>

  <div className="mt-10 text-center">
    <Link href="/menu"
      className="inline-flex items-center gap-1 text-sm font-semibold text-amber-400
                 hover:text-amber-500 transition-colors">
      View full menu →
    </Link>
  </div>
</section>
```

### FeaturedDishCard

Defined as a named function inside `page.js` (not a separate file), since it is only used here and requires no client interactivity. **Note: if client-side interactivity is ever added to this card (click handlers, hover JS), extract it into a separate `"use client"` file at that point.**

```jsx
// Inline sub-component — Server Component, no "use client".
// Extract to a separate file if client interactivity is needed in the future.
function FeaturedDishCard({ dish, priority = false }) {
  return (
    <li className="group min-w-0">
      <Link
        href={`/menu/${toSlug(dish.name)}`}
        prefetch={false}
        className="flex h-full flex-col overflow-hidden rounded-xl border border-neutral-800
                   bg-neutral-900/70 transition-colors hover:border-emerald-500/70"
      >
        {/* image container — group-hover:scale-[1.03] for zoom effect (CSS transform, no JS) */}
        <div className="overflow-hidden">
          <Image
            src={getDishCardImage(dish.image)}
            alt={`Photo of ${dish.name}`}
            width={512}
            height={288}
            unoptimized
            priority={priority}
            fetchPriority={priority ? "high" : undefined}
            className="aspect-[16/9] w-full object-cover bg-neutral-800
                       transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </div>
        <span className="flex flex-1 flex-col p-4">
          <span className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-400">
            {dish.category}
          </span>
          <span className="flex items-start justify-between gap-3">
            <strong className="font-serif text-base font-medium text-neutral-100
                               transition-colors group-hover:text-amber-400">
              {dish.name}
            </strong>
            <span className="shrink-0 text-sm font-semibold text-amber-400">
              {dish.price} Br
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}
```

### Closing CTA banner

```jsx
<section className="rounded-2xl bg-amber-400/10 border border-amber-400/20
                    px-8 py-12 mb-8 text-center">
  <h2 className="font-serif text-3xl text-neutral-100 mb-4">Ready to order?</h2>
  <p className="text-neutral-300 mb-6 max-w-md mx-auto">
    Browse our full menu and place your order in minutes.
  </p>
  <Link href="/menu"
    className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-8 py-4
               text-base font-semibold text-neutral-950 transition-all duration-200
               hover:bg-amber-500 hover:scale-105
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
    Order Now →
  </Link>
</section>
```

### Metadata preservation

```js
export const metadata = {
  title: "Addis Eats — Authentic Ethiopian restaurant, menu & delivery",
  description: "Explore Addis Eats for fresh Ethiopian dishes, coffee, and street-food favorites.",
};
```

### Full `page.js` structure

```js
import Link from "next/link";
import Image from "next/image";
import { getDishes, getDishCardImage } from "@/lib/dishes";
import { toSlug } from "./menu/slug";

export const metadata = { /* ... */ };

export default async function HomePage() {
  const allDishes = await getDishes();
  const featuredIds = ["d1", "d8", "d9", "d11"];
  const featuredDishes = allDishes.filter((d) => featuredIds.includes(d.id));

  return (
    <>
      {/* Hero */}
      {/* Featured dishes */}
      {/* CTA banner */}
    </>
  );
}

function FeaturedDishCard({ dish, priority }) { /* ... */ }
```

---

## Error Handling

**Feature 1 — OG images:** `generateMetadata` returns `parent` metadata when no dish matches the slug — no runtime throw. No code change needed.

**Feature 3 — Landing page:** `getDishes()` is `async` but reads from an in-memory array — it resolves immediately with no I/O. If it ever throws (e.g., future DB migration), the async Server Component propagates the error to the nearest `error.js` boundary (`src/app/error.js` exists). No special `try/catch` needed at the page level.

**MobileNav:** Uses only `useState` and direct imports of `Link` and `signOut`. No async operations; no error surface.

---

## Edge Cases

- **Very long dish names in cart:** The flex-col layout on mobile ensures names wrap rather than overflow.
- **CategoryBar with many categories:** Horizontal scroll handles an arbitrary number of categories. The `@utility scrollbar-none` hides the scrollbar on mobile for a clean appearance; touch swipe still works.
- **Landing page SSR:** `getDishes()` resolves from an in-memory array — fully synchronous after the `await`. No Suspense needed.
- **Hero min-height on short screens:** `min-h-[70vh]` with `py-16` on a 568 px-tall iPhone SE gives ~400 px — all hero content fits. Content is `flex-col items-center justify-center` so nothing clips.
- **iOS input zoom (CheckoutForm + FilterShell search):** All `<input>` elements get `text-base` (16 px) on mobile via `text-base sm:text-sm` to prevent iOS Safari auto-zoom on focus.
- **Featured dish card priority:** The first card (`priority={index === 0}`) gets `fetchPriority="high"` on its `<Image>` so the LCP element on the landing page loads with high network priority.
- **`toSlug` import path from `page.js`:** The slug utility is at `src/app/menu/slug.js`. From `src/app/page.js`, the import is `import { toSlug } from "./menu/slug"` (relative) or `@/app/menu/slug` (alias). Either works; use the relative path to match the pattern used in `DishCard.jsx`.

---

## Testability

- **Unit:** `toSlug(dish.name)` against each of the 13 dish names can be checked with a plain Node script — all 13 were verified to match the OG JPEG basenames.
- **Build-time:** `npm run build` runs `generateStaticParams` for all 13 dish pages. Any broken `generateMetadata` or missing OG file surfaces as a build error.
- **Visual mobile:** Resize browser to 320 px, verify: no horizontal scrollbar on any page, all buttons ≥44 px, hero visible on landing page.
- **Contrast:** The hero uses near-black (`#17211b`) text on near-white (`#f5f8f6`) background — approximately 15:1 contrast, well above WCAG AA (4.5:1).
- **iOS zoom:** Open checkout and menu pages on iOS Safari; inputs must not trigger viewport zoom on focus.

---

## Responses to Review Findings

| # | Severity | Finding | Response |
|---|----------|---------|----------|
| 1 | HIGH | Hero text unreadable (near-black on dark-green) | **Addressed.** Hero background changed to `bg-neutral-900` (`#f5f8f6`). Text uses `text-neutral-100` (`#17211b` near-black) on a near-white background — ~15:1 contrast. |
| 2 | HIGH | `hover:bg-amber-300` = `hover:bg-amber-400` (identical, no visual change) | **Addressed.** All CTA hover states changed to `hover:bg-amber-500` (`#166634`), which is visibly darker than `amber-400` (`#15803d`). |
| 3 | HIGH | `getDishes()` is async — landing page needs `async` + `await` | **Addressed.** `HomePage` is declared `async function HomePage()` and uses `const allDishes = await getDishes()`. |
| 4 | MEDIUM | `og:title` format ambiguous between `<title>` and `openGraph.title` | **Addressed.** Explicit note added to Feature 1: do not modify the `title` field; only `openGraph.title` carries the full suffix. |
| 5 | MEDIUM | Contradictory negative-margin bleed vs. contained hero in same paragraph | **Addressed.** All mention of negative-margin bleed removed. Design states once: contained hero with gradient background, no negative margins. |
| 6 | MEDIUM | `MobileNav` props omit `signOut` — no guidance on how client component calls it | **Addressed.** `MobileNav` imports `signOut` directly from `@/app/actions`. This is valid per in-repo docs (`use-server.md`). Props spec is `{ session: { name, role } | null }`. |
| 7 | MEDIUM | `getDishCardImage` import missing from `page.js` sketch | **Addressed.** Added to import line: `import { getDishes, getDishCardImage } from "@/lib/dishes"`. |
| 8 | MEDIUM | `scrollbar-none` must use `@utility` in Tailwind v4 | **Addressed.** Changed to `@utility scrollbar-none { scrollbar-width: none; &::-webkit-scrollbar { display: none; } }`. |
| 9 | MEDIUM | Sort/count row not addressed — overflows at 320 px | **Addressed.** Outer sort/count `<div>` changed to `flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between`. |
| 10 | NIT | Checkout link tap-target already met — design overstates it | **Addressed.** Change to `block w-full` labelled explicitly as optional UX enhancement, not a required fix. |
| 11 | NIT | Design makes no mention of checking in-repo docs (AGENTS.md requirement) | **Addressed.** Added explicit instruction at top of design: check `node_modules/next/dist/docs/` before writing any code. |
| 12 | NIT | `FeaturedDishCard` inlined — note intent | **Addressed.** Added comment in code sketch: "Extract to a separate file if client interactivity is needed." |
| 13 | NIT | `animate-[...]` token order non-obvious | **Addressed.** Code comment added explaining 5-token order: name · duration · delay · timing-function · fill-mode. |
