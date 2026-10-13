# Requirements — Addis Eats: OG Images, Mobile Responsiveness & Interactive Landing Page

## Summary

Three distinct improvements to the Next.js food-ordering app at `addis_eats/`:

1. **Per-dish OpenGraph images** — every dish detail route `/menu/[slug]` must expose its own `og:image` so social-media crawlers display the dish photo when a link is shared.
2. **Mobile responsiveness** — the entire app must be usable on small screens (≥320 px wide) with no horizontal scroll, readable text, and tap targets that meet the 44 px minimum.
3. **Interactive landing page** — `src/app/page.js` must be replaced with a visually rich, animated hero + featured-dishes page that drives users to the menu.

All changes must survive `npm run build` with zero errors.

---

## Assumptions

- **OG images already implemented.** Inspection of `src/app/menu/[slug]/page.jsx` shows that `generateMetadata` is already present and already returns correct `openGraph.images` pointing to `/og/dishes/<slug>.jpg`. All 13 dish slugs produced by `toSlug()` match the filenames already committed in `public/og/dishes/`. **No new code is needed for requirement 1 unless the build reveals it is broken or missing for any dish.** The implementer must verify by running the build and spot-checking at least two dish pages.
- **OG filename mapping is 1-to-1 with slugs.** The `toSlug()` function in `src/app/menu/slug.js` produces values that are byte-identical to the OG JPEG basenames for all 13 dishes. No lookup table is needed.
- **`globals.css` uses Tailwind v4 `@theme` overrides** (confirmed from file content). The mobile fixes must remain compatible with this configuration.
- **No new third-party libraries** may be added for animations; Tailwind utility classes and native CSS transitions are sufficient.
- **Featured dishes on the landing page** should be a curated static subset (3–4 dishes), not a dynamic database query, since the page is a Server Component and the full dish list is already available from `getDishes()` in `src/lib/dishes.js`.
- **`src/components/`** does not exist in the repo; no shared-component directory needs to be audited.
- The kitchen and orders routes (`/kitchen`, `/orders`) are staff-facing and are out of scope for visual polish, but must not regress on mobile after layout changes.

---

## Functional Requirements

### FR-1 — Per-dish OpenGraph metadata

1. Every URL `/menu/<slug>` must return HTTP response headers (or HTML `<meta>` tags) containing `og:image` pointing to the absolute URL of the matching `/og/dishes/<slug>.jpg` static file.
2. The `og:title` must equal `"<Dish Name> | Addis Eats"`.
3. The `og:description` must equal `"<dish.name> — <dish.description>"`.
4. A `twitter:card` of `summary_large_image` must also be present on each dish page.
5. The OG image URL must be absolute (using `absoluteUrl()` from `src/lib/site.js`), not root-relative.
6. If a dish slug has no matching OG JPEG in `public/og/dishes/`, the route must still render without throwing; the missing image is an asset gap, not a runtime error.

### FR-2 — Mobile responsiveness

7. The root layout header (`src/app/layout.js`) must collapse its navigation on screens narrower than `sm` (640 px) — either via a hamburger menu or by stacking links vertically — so no horizontal overflow occurs.
8. All interactive elements (buttons, links, form inputs, `Remove` buttons in cart) must have a minimum tap target of 44 × 44 px on mobile.
9. The menu page (`/menu`) and its `FilterShell` component must not overflow horizontally on 320 px–wide viewports; the search input must be full-width on mobile.
10. The dish detail page (`/menu/[slug]`) must display the dish image, title, price, description, and "Add to Cart" button in a single readable column on mobile with no horizontal overflow.
11. The cart page and checkout form must be usable on mobile: labels, inputs, and the submit button must each be full-width or appropriately sized.
12. Font sizes throughout the app must remain ≥14 px (0.875 rem) on body text on all screen sizes; no text may overflow its container.
13. The `CategoryBar` filter tabs on the menu page must be horizontally scrollable on mobile rather than wrapping into multiple rows in a way that pushes content off-screen.

### FR-3 — Interactive landing page

14. `src/app/page.js` must be rewritten as a Server Component (no top-level `"use client"`) that renders a full-page landing experience.
15. The page must include a **Hero section** containing:
    - A bold, large headline (e.g., "Taste of Addis").
    - A subheadline describing the restaurant's offering.
    - A prominent CTA button linking to `/menu`.
16. The page must include a **Featured Dishes section** displaying 3–4 dish cards. Each card must show:
    - The card image from `public/dishes/display/card/<slug>.webp` (via `getDishCardImage()`).
    - The dish name, category badge, and price.
    - A link to the dish's detail page `/menu/<slug>`.
17. All animations and transitions must use Tailwind CSS utility classes or native CSS `transition`/`animation` properties defined in `globals.css`. No new npm packages.
18. The landing page must be mobile-first: a single-column layout on small screens, expanding to multi-column on `md` (768 px) and wider.
19. The existing `metadata` export on `page.js` (title and description) must be preserved or improved; it must not be deleted.
20. If any interactive behavior is needed on the landing page (e.g., hover effects requiring JS), it must be extracted into a minimal `"use client"` island component; the page shell must remain a Server Component.

---

## Non-Functional Requirements

- **Build**: `npm run build` (cwd `addis_eats/`) must complete with no errors or type errors after all changes.
- **Performance**: The landing page hero image (if any full-bleed background is used) must be loaded with `priority` / `fetchPriority="high"` on the Next.js `<Image>` component. No new render-blocking resources.
- **Accessibility**: All interactive elements must have accessible labels. Images must have non-empty `alt` text. CTA buttons must have descriptive text (not just "Click here").
- **No regressions**: Staff routes (`/kitchen`, `/orders`, `/signin`) must continue to function and must not visually break.

---

## Acceptance Criteria

1. Visiting `https://addiseatsnext.vercel.app/menu/special-doro-wat` and inspecting `<head>` returns `<meta property="og:image" content="https://addiseatsnext.vercel.app/og/dishes/special-doro-wat.jpg" />`.
2. The same check on at least two other dish slugs (e.g., `traditional-buna-ethiopian-coffee`, `garden-veggie-and-avocado-burger`) also returns the correct absolute OG image URL.
3. On a 375 px viewport, the root layout header renders without horizontal overflow and all nav links are reachable.
4. On a 375 px viewport, every button and interactive link on the cart and checkout pages has a visible tap area of at least 44 px in height.
5. On a 320 px viewport, the menu page search input is full-width and no content is clipped or scrolled horizontally.
6. On a 375 px viewport, the dish detail page renders the dish image, name, price, description, and "Add to Cart" button in a single readable column.
7. The landing page (`/`) displays a hero section with a headline, subheadline, and a CTA button that navigates to `/menu` when clicked.
8. The landing page displays exactly 3 or 4 featured dish cards, each with an image, name, category, price, and a working link to the corresponding `/menu/<slug>` page.
9. All CSS animations/transitions on the landing page are implemented using only Tailwind utility classes or native CSS; `npm ls` shows no new animation libraries added.
10. `npm run build` exits with code 0 and no `Error:` lines in its output.
11. The root layout `<html>` element retains `lang="en"` and the page `<title>` is set correctly on all routes (verified by viewing page source).

---

## Out of Scope

- Generating new OG JPEG files — all 13 are already present in `public/og/dishes/`.
- Adding a dynamic OG image generation endpoint (`opengraph-image.js` per-dish route) — the static JPEG approach already in place is sufficient.
- Authentication UI redesign, kitchen dashboard UI, or orders page visual overhaul.
- Dark/light mode toggle.
- Any changes to the backend API routes (`/api/dishes`, `/api/orders`).
- SEO improvements beyond OG metadata (e.g., sitemap changes, structured data additions).
- Adding a shopping cart icon or cart item count to the header (unless it falls naturally out of the mobile nav refactor).
- A11y audit beyond the minimum stated in Non-Functional Requirements.
