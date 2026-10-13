# Technical Design — OG Images, Mobile Responsiveness & Interactive Landing Page

## Overview

This is a Next.js 16.3.5 app using React 19, Tailwind CSS v4 (via `@tailwindcss/postcss`), and the App Router. The colour palette is overridden in `globals.css` via `@theme inline` — `neutral-950` is white and `neutral-100` is near-black, which is the inverse of Tailwind's standard scale. All class names in this design respect that override. The tech stack is locked: Next.js App Router, Tailwind v4 utility classes, no new npm packages.

Three features are implemented across: (1) per-dish OG metadata — already coded and correct, needing only build verification; (2) mobile responsiveness — targeted Tailwind fixes across layout, nav, and key pages; (3) a new interactive landing page — a Server Component page with a hero section and featured-dishes grid.

---

## Feature 1 — Per-Dish OpenGraph Images

### Finding

After reading `src/app/menu/[slug]/page.jsx`, `src/app/menu/slug.js`, and comparing all 13 dish names against the 13 files in `public/og/dishes/`, the feature is **already fully implemented**. `generateMetadata` exports the correct `openGraph.images` array pointing to `absoluteUrl(/og/dishes/${slug}.jpg)`, with `twitter.card = "summary_large_image"`. The `toSlug()` function produces byte-identical names to the OG JPEG basenames for all 13 dishes (e.g. `garden-veggie-and-avocado-burger`, `honey-tej-fermented-honey-wine`).

### Implementation action

No code changes are needed. The implementer must run `npm run build` and confirm no build error touches `src/app/menu/[slug]/page.jsx`. Two spot-checks in the build output (`special-doro-wat` and `traditional-buna-ethiopian-coffee`) will confirm OG tags render.

---

## Feature 2 — Mobile Responsiveness

### Tailwind v4 context

`globals.css` redefines the `neutral` and `amber` scales via `@theme inline`. This design uses the same class names already in the codebase — the custom overrides are transparent to Tailwind class usage. No `theme()` function calls or `extend` blocks are needed.

### 2a — Root layout header (`src/app/layout.js`)

**Problem:** The header `<nav>` is a flat `flex` row with `gap-6`. On a 320–640 px viewport this overflows horizontally.

**Solution:** Add a mobile hamburger toggle extracted as a `"use client"` component `src/app/MobileNav.jsx`. The layout server component renders `<MobileNav>` in place of the inline `<nav>`. This keeps the layout itself a Server Component.

`MobileNav.jsx` structure:
- State: `const [open, setOpen] = useState(false)`.
- Renders a `<button>` (hamburger icon, min 44 × 44 px tap target) visible only on `sm:hidden`.
- Renders the nav links in a `<nav>` that is `hidden` on mobile when `!open`, `block` when `open`, absolutely positioned below the header, full-width, with a dark background (`bg-neutral-950 border-b border-neutral-800`).
- On `sm` and wider, the nav links display as the current flat row (`sm:flex sm:items-center sm:gap-6`), and the hamburger is hidden (`sm:hidden`).
- Each nav link must be `block py-3 px-6 text-base` (≥44 px tap height) in the mobile stack.
- The sign-out `<form>` button and Sign-in link are included in the mobile menu with the same `block py-3 px-6` sizing.

`MobileNav` receives all session-dependent data as props from the layout server component so no extra server calls are made from the client component.

Props: `{ session: { name, role } | null }`.

The header outer `<div>` changes from `px-8 py-4` to `px-4 py-3 sm:px-8 sm:py-4` to reclaim horizontal space on small screens. The `<main>` padding changes from `p-8` to `p-4 sm:p-8`.

### 2b — Menu page filter shell (`src/app/menu/FilterShell.jsx`)

**Problem:** The `CategoryBar` wraps into multiple rows when there are many categories on narrow viewports, which is acceptable, but the sort select label can overflow.

**Finding:** `FilterShell` already uses `flex-col` on small screens and `sm:flex-row` for the search/sort bar — this is correct. The search input uses `w-full`, which is correct. The sort `<select>` is inside a `<label>` that does not constrain its width; on very narrow screens the select may push the label off-screen.

**Fix in `FilterShell.jsx`:** Wrap the sort label in `<label className="flex items-center gap-2 min-w-0">` and add `min-w-0` to the `<select>` element. Also add `overflow-x-hidden` to the outer `<div className="space-y-6">` wrapper to prevent any child overflow leaking.

**`CategoryBar.jsx`:** Change `flex flex-wrap gap-2` to `flex gap-2 overflow-x-auto pb-1 scrollbar-none` — this makes the category pills scroll horizontally as a single row instead of wrapping. Each pill keeps its existing `px-4 py-2` (≥44 px height achievable with `py-3` — bump to `py-2.5` to hit ~40 px; exact 44 px is achieved by adding `min-h-[44px]` to each button). Add `shrink-0` to each `<button>` to prevent pills from compressing.

To hide the scrollbar on WebKit without a plugin, add to `globals.css`:
```css
.scrollbar-none {
  scrollbar-width: none;
}
.scrollbar-none::-webkit-scrollbar {
  display: none;
}
```

### 2c — Dish detail page (`src/app/menu/[slug]/page.jsx`)

**Finding:** The page is already constrained to `max-w-3xl`. The image uses `w-full` and `aspect-[16/9]`. The text elements use relative units. No changes needed structurally.

**Fix:** The `<h1>` uses `text-4xl` with no responsive fallback — on 320 px this may be tight. Change to `text-3xl sm:text-4xl`. The `<p>` price line (`text-2xl`) is fine. `AddToCartButton` has `px-6 py-3` which is ≥44 px height. No further changes.

### 2d — Cart page (`src/app/cart/CartItems.jsx`)

**Finding:** Cart items use `flex justify-between` with the price and Remove button on the right. On narrow screens the dish name and the price+button cluster may overflow if the name is long.

**Fix:** Change the `<li>` inner layout to allow wrapping: `flex flex-wrap justify-between items-center gap-y-1`. Change the name `<div>` to `min-w-0` with `truncate` only as a fallback — actually keep full name visible by allowing the row to wrap at `sm` instead. Specifically:
- Outer `<li>`: `flex flex-col gap-1 py-3 border-b border-neutral-800 sm:flex-row sm:items-center sm:justify-between`
- Name `<div>`: `flex-1 min-w-0`
- Price+button `<div>`: `flex items-center gap-3 self-start sm:self-auto`
- Remove `<button>`: add `min-h-[44px] px-2` to hit tap target minimum.
- "Proceed to Checkout" `<Link>`: change to `block w-full text-center py-3 ...` on mobile, keeping `inline-block` on sm+ via `sm:inline-block sm:w-auto`.

### 2e — Checkout form (`src/app/checkout/CheckoutForm.jsx`)

**Finding:** All inputs already use `w-full`. The `<button type="submit">` already uses `w-full py-3`, giving ≥44 px. The `max-w-2xl` wrapper is fine.

**Fix:** Add `text-base` (16 px) to all `<input>` elements to prevent iOS Safari from auto-zooming on focus (iOS zooms in when an input has font-size < 16 px). Current inputs use `text-sm` (14 px). Change to `text-base sm:text-sm` on each input field in `CheckoutForm.jsx`.

Also add `text-base sm:text-sm` to the `FilterShell` search input for the same iOS zoom reason.

### 2f — `<main>` layout constraint

The root layout `<main>` has `p-8 max-w-6xl`. Change `p-8` to `p-4 sm:p-6 lg:p-8` so the landing page and menu page have breathing room on mobile without the 32 px side padding eating into the content area on 320 px viewports.

---

## Feature 3 — Interactive Landing Page

### Architecture decision

The current `page.js` is a minimal placeholder. The new page is a **Server Component** that calls `getDishes()` (already imported in the menu page — no new data fetch pattern). No `"use client"` is needed at the page level. Hover animations are CSS-only via Tailwind's `group-hover:` utilities, which work without JS.

A single client island `src/app/HeroButton.jsx` is extracted **only if** a JS-driven interaction is required (e.g. a scroll-to-section or animated CTA). On reflection, the CTA is a plain `<Link href="/menu">` — no JS needed. Therefore no client island is required for the initial implementation; if the designer later wants an animated counter or parallax, that can be added without a Page-level architecture change.

### Curated featured dishes

The landing page renders exactly 4 featured dishes, selected statically by ID. The 4 chosen dishes represent different categories and have the strongest visual appeal:

| ID  | Name                          | Category  | Image (card) |
|-----|-------------------------------|-----------|--------------|
| d1  | Special Doro Wat              | Ethiopian | `doro-wat.webp` |
| d8  | Addis Gourmet Double Smash    | Burgers   | `addis-double-smash.webp` |
| d9  | Crispy Zesty Chicken Burger   | Burgers   | `crispy-chicken-burger.webp` |
| d11 | Traditional Buna (Ethiopian Coffee) | Drinks | `ethiopian-coffee.webp` |

These are selected at build time by filtering `getDishes()` on the IDs array `["d1","d8","d9","d11"]`. This avoids hardcoding the full dish object and respects any future name or price change in `dishes.js`.

The `getDishCardImage()` helper from `src/lib/dishes.js` provides the card image path (e.g. `/dishes/display/card/doro-wat.webp`).

### Page structure (`src/app/page.js`)

```
<main> (full-width, no max-width constraint from layout — override with own container)
  <HeroSection>      <!-- full-viewport-height hero -->
  <FeaturedSection>  <!-- 4-dish grid -->
  <CtaBanner>        <!-- closing CTA strip -->
</main>
```

Because the root layout's `<main>` applies `max-w-6xl p-4 sm:p-6 lg:p-8`, the landing page content sits inside that wrapper. The hero is designed to work within the constrained max-width — a full-bleed background is achieved by a negative-margin escape: `mx-[-1rem] sm:mx-[-1.5rem] lg:mx-[-2rem] px-4 sm:px-6 lg:px-8` on the hero `<section>` with `overflow-hidden` on the layout's `<main>`. Alternatively, the hero can use a contained layout with a gradient background that fills its bounds (no bleed), which is simpler and avoids any overflow risk. **Design choice: use contained hero with gradient background** — this is safer across all breakpoints and requires no layout changes.

### Hero section

```jsx
<section className="relative flex min-h-[70vh] flex-col items-center justify-center
                    rounded-2xl overflow-hidden bg-neutral-200 py-16 px-6 text-center
                    sm:py-24">
  {/* gradient overlay */}
  <div className="absolute inset-0 bg-gradient-to-br from-neutral-200 via-neutral-200/95 to-amber-400/10 pointer-events-none" />

  {/* badge */}
  <p className="relative z-10 mb-4 inline-flex items-center gap-2 rounded-full
                bg-amber-400/15 px-4 py-1.5 text-xs font-semibold uppercase
                tracking-[0.2em] text-amber-400 animate-[fadeInDown_0.6s_ease_both]">
    Addis, served fresh
  </p>

  {/* headline */}
  <h1 className="relative z-10 font-serif text-5xl font-bold text-neutral-100
                 leading-tight max-w-xl sm:text-6xl lg:text-7xl
                 animate-[fadeInDown_0.7s_0.1s_ease_both]">
    Taste of Addis
  </h1>

  {/* subheadline */}
  <p className="relative z-10 mt-6 max-w-lg text-lg text-neutral-400 leading-relaxed
                animate-[fadeInDown_0.7s_0.2s_ease_both]">
    Authentic Ethiopian flavours — doro wat, kitfo, fresh juices, and ceremonial coffee.
    Order online, delivered fast.
  </p>

  {/* CTA */}
  <Link href="/menu"
    className="relative z-10 mt-10 inline-flex items-center gap-2 rounded-full
               bg-amber-400 px-8 py-4 text-base font-semibold text-neutral-950
               transition-transform duration-200 hover:scale-105 hover:bg-amber-300
               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400
               animate-[fadeInUp_0.6s_0.3s_ease_both]">
    Explore the Menu →
  </Link>
</section>
```

### Keyframe animations

Three keyframe animations are added to `globals.css` using native CSS `@keyframes`. This requires no new library — Tailwind v4 supports `animate-[name_duration_delay_easing_fill]` arbitrary values.

```css
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

  <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
    {featuredDishes.map((dish) => (
      <FeaturedDishCard key={dish.id} dish={dish} />
    ))}
  </ul>

  <div className="mt-10 text-center">
    <Link href="/menu"
      className="inline-flex items-center gap-1 text-sm font-semibold text-amber-400
                 hover:text-amber-300 transition-colors">
      View full menu →
    </Link>
  </div>
</section>
```

`FeaturedDishCard` is a sub-component inside `page.js` (not a separate file, since it is only used here). It mirrors the structure of `DishCard.jsx` but adds a subtle `group-hover:scale-[1.02] transition-transform duration-300` on the card image container to create a zoom-on-hover effect without JS.

### Closing CTA banner

```jsx
<section className="rounded-2xl bg-amber-400/10 border border-amber-400/20
                    px-8 py-12 mb-8 text-center">
  <h2 className="font-serif text-3xl text-amber-400 mb-4">Ready to order?</h2>
  <p className="text-neutral-400 mb-6 max-w-md mx-auto">
    Browse our full menu and place your order in minutes.
  </p>
  <Link href="/menu"
    className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-8 py-4
               text-base font-semibold text-neutral-950 transition-transform
               duration-200 hover:scale-105 hover:bg-amber-300">
    Order Now →
  </Link>
</section>
```

### Metadata preservation

The existing `metadata` export is preserved and enhanced:
```js
export const metadata = {
  title: "Addis Eats — Authentic Ethiopian restaurant, menu & delivery",
  description: "Explore Addis Eats for fresh Ethiopian dishes, coffee, and street-food favorites.",
};
```

---

## File Change Summary

| File | Change |
|------|--------|
| `src/app/layout.js` | Reduce mobile padding; render `<MobileNav>` client island |
| `src/app/MobileNav.jsx` | **New file** — `"use client"` hamburger nav island |
| `src/app/globals.css` | Add `@keyframes` + `.scrollbar-none` utility |
| `src/app/page.js` | Full rewrite — hero + featured dishes + CTA banner |
| `src/app/menu/CategoryBar.jsx` | Horizontal scroll + `shrink-0` + `min-h-[44px]` on pills |
| `src/app/menu/FilterShell.jsx` | `min-w-0` on sort label; `text-base sm:text-sm` on search input |
| `src/app/cart/CartItems.jsx` | Wrap layout for mobile; `min-h-[44px]` on Remove button; full-width checkout link on mobile |
| `src/app/checkout/CheckoutForm.jsx` | `text-base sm:text-sm` on inputs (iOS zoom fix) |
| `src/app/menu/[slug]/page.jsx` | `text-3xl sm:text-4xl` on `<h1>` — no other changes |

No new npm packages. No changes to API routes, kitchen, orders, or signin pages.

---

## Error Handling

**Feature 1 — OG images:** `generateMetadata` already handles a missing dish gracefully — it returns `parent` metadata when no match is found, so the route renders without throwing. No new error handling needed.

**Feature 3 — Landing page:** `getDishes()` is a synchronous array return (no I/O, no network call). It cannot fail. If in future it becomes async with a network call, the `async` Server Component will propagate the error to the nearest `error.js` boundary — no special handling is needed at the page level.

**Mobile nav client island:** `MobileNav` uses only `useState` and `Link`. No async operations, no error surface.

---

## Edge Cases

- **Very long dish names in cart**: The cart item layout change (flex-col on mobile) ensures the name wraps rather than overflows or truncates.
- **CategoryBar with many categories**: Horizontal scroll handles an unlimited number of categories without wrapping. The `scrollbar-none` utility hides the browser scrollbar on mobile for a clean look; swipe gestures still work.
- **Landing page on SSR**: `getDishes()` is synchronous so the landing page renders fully on the server with no Suspense needed.
- **Hero min-height on short screens**: `min-h-[70vh]` with `py-16` means on a 568 px-tall iPhone SE the hero takes ~400 px — the subheadline and CTA remain visible without scrolling because the content is `flex flex-col items-center justify-center`.
- **iOS input zoom**: All form inputs in `CheckoutForm` and the search input in `FilterShell` get `text-base` on mobile to prevent iOS Safari's auto-zoom behaviour on inputs with font-size < 16 px.
- **Featured dish card images**: `getDishCardImage()` transforms `/dishes/doro-wat.webp` → `/dishes/display/card/doro-wat.webp`. All 4 chosen dish card images are confirmed present in `public/dishes/display/card/`.

---

## Testability

- **Unit**: `toSlug()` + OG filename mapping is fully unit-testable by running `toSlug(dish.name)` against each dish in `dishes.js` and asserting it equals the corresponding filename stem — no test framework needed beyond Node's `assert`.
- **Build-time verification**: `npm run build` with `generateStaticParams` will attempt to render all 13 dish pages; any missing OG file or broken `generateMetadata` will surface as a build error.
- **Visual**: The landing page and mobile nav can be tested by resizing the browser to 320 px and 375 px. Automated: a Playwright test could visit `/` at 375 px and assert the hero `<h1>` is visible and the "Explore the Menu →" link exists with `href="/menu"`.
- **Mobile tap targets**: Chrome DevTools touch simulation at 375 px + accessibility panel will flag any element below 44 × 44 px.
