# Performance Notes — Addis Eats

**Live app:** https://addiseatsnext.vercel.app · Last updated 2026-10-10.

## Budget table (Day 45 brief targets)

Filled twice — before optimisation and after — because the improvement *is* the evidence.
**"After" = Lighthouse on the deployed build** (`https://addiseatsnext.vercel.app`), 2026-10-10.

| Measure | Target | Before | After (deployed) | Status |
| --- | --- | ---: | ---: | --- |
| Lighthouse performance, `/menu` | ≥ 90 | **81** | **96** | ✅ |
| Lighthouse performance, `/` | ≥ 90 | not captured | **95** | ✅ |
| Lighthouse performance, `/menu/[slug]` | ≥ 90 | not captured | **97** | ✅ |
| LCP, `/menu` (simulated mobile) | < 2.5 s | 1.8 s *(text-only baseline)* | **2.20 s** | ✅ |
| LCP, `/` | < 2.5 s | not captured | **1.60 s** | ✅ |
| LCP, `/menu/[slug]` | < 2.5 s | not captured | **2.28 s** | ✅ |
| CLS (all routes) | < 0.1 | **0** | **0** | ✅ |
| First Load JS, `/menu` | < 120 kB | — | **156.2 kB** transferred (12 scripts; 598 kB raw) | ❌ documented below |
| Largest image on disk | < 150 kB | — | **132.7 kB** (`bbq-chicken-pizza.webp`; 20.2 kB largest transfer) | ✅ |

**Rules this table follows**

- A miss is written down with its cause instead of being hidden. One target is missed; it is
  framework-bound, not sloppiness (see "Why First Load JS is structural").
- The "before" column for `/` and `/menu/[slug]` was genuinely not captured — the baseline run was taken on
  the original text-only `/menu`, so those cells stay empty rather than invented.

### Deployed report — 2026-10-10 (Lighthouse CLI, mobile, simulated throttling)

| Route | Performance | Accessibility | Best Practices | SEO | FCP | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | **95** | 100 | 100 | 100 | 1.25 s | **1.60 s** | 0 | 220 ms |
| `/menu` | **96** | 96 | 100 | 100 | 1.11 s | **2.20 s** | 0 | 191 ms |
| `/menu/special-doro-wat` | **97** | 95 | 100 | 100 | 1.01 s | **2.28 s** | 0 | 144 ms |

Transfer measured on `/menu`: 12 script files = **156.2 kB**; 4 images = 66.8 kB; whole page = 273.7 kB.

**What the deployment changed.** The localhost run (2.6–2.7 s LCP, 560–760 ms TBT) missed the 2.5 s target;
the same pages on Vercel pass it. The hypothesis written in the previous revision — CDN, Brotli and HTTP/2
versus a single local Node process with no compression pipeline — is confirmed by measurement, not assumed.

### Honest reading of the earlier localhost numbers

The 1.8 s → 2.7 s movement seen on `localhost` was **not** a regression: the 1.8 s baseline page had no
photographs at all. Once real dish photos were added (a requirement — images are part of the product), the
LCP element changed from a headline to a photo. The comparison that matters is *photographs before
optimisation* vs *photographs after optimisation* (2.4 s → 1.8 s from the `priority` fix alone), and
ultimately the deployed figures above.

### Stale by design: the `/` row above predates the dynamic landing page

The home page was a text-only stub when the 2026-10-10 report was run. On 2026-10-13 it was replaced with
a dynamic landing page whose LCP element is now a photo — the pre-cropped 900 × 506 `doro-wat.webp`,
served through the optimizer at **34.4 kB** for the ~640w hero (down from the raw 46.7 kB, see "Image
optimisation" below), with `preload` + `fetchPriority="high"`. Expect `/` to track `/menu/[slug]`
(2.28 s, image LCP) rather than the 1.60 s headline LCP recorded above; the row is left unchanged rather
than restated from a guess — re-run Lighthouse CLI against the next deployment to refresh it.

---

## Image sizes (static assets)

Dish cards and detail pages render with Next.js `Image` and use pre-cropped local WebP assets, so the
browser downloads only the displayed 16:9 crop rather than the full-size photo.

| Asset | Dimensions | Size on disk | Target (< 150 kB) |
| --- | --- | ---: | --- |
| `dishes/display/card/*.webp` (13 files) | 512 × 288 | 4–33 kB each (~220 kB total) | ✅ |
| `dishes/display/detail/*.webp` (13 files) | 900 × 506 | up to 83 kB each | ✅ |
| `bbq-chicken-pizza.webp` (full-size, used as the social image source) | 575 × 580 | **132.7 kB** | ✅ |
| `margherita-classica.webp` | 467 × 519 | 89.0 kB | ✅ |
| `bayenetu.webp` | 452 × 587 | 69.4 kB | ✅ |
| `doro-wat.webp` | 596 × 594 | 67.7 kB | ✅ |

Details that matter:

- The first card of a page is the LCP candidate: it gets `preload` + `fetchPriority="high"`; every other
  card stays lazy (`loading="lazy"`). The detail/hero image is always `preload` because it is the LCP
  element on `/` and `/menu/[slug]`.
- Images render **through the `/_next/image` optimizer** (changed 2026-10-13, see "Image optimisation"
  below). Every `<Image>` carries a `sizes` attribute matching its real rendered width, so the browser
  picks a variant at or below the source size instead of always downloading the full asset.
- Every `<Link>` sets `prefetch={false}`, so hovering a dish card does not download its destination page.
- **Social images cost nothing at page load.** The 1200 × 630 previews (≈ 95 kB PNG) are generated by
  `opengraph-image.js` routes only when a scraper or a shared link requests them — they never appear in
  the page's own request waterfall, so they do not affect LCP, TBT or First Load JS.

### Image optimisation (changed 2026-10-13)

Every `<Image>` used to be marked `unoptimized`, which served the pre-cropped WebP as-is and skipped
`srcset`/`sizes` entirely. It was switched **on** (by dropping `unoptimized` and adding `sizes` to each
image) because the rendered width is smaller than the source file, so the optimizer returns a lighter
download. Measured locally against the running build, browser `Accept: image/webp`:

| Asset | Rendered context | Raw file (before) | Optimized variant (after) | Δ |
| --- | --- | ---: | ---: | ---: |
| `detail/doro-wat.webp` | hero, ~640w | 46.7 kB | **34.4 kB** (640w) | −26% |
| `detail/bbq-chicken-pizza.webp` | detail hero, ~640w | 85.3 kB | **59.4 kB** (640w) | −30% |
| `detail/margherita-classica.webp` | detail hero, ~640w | 67.9 kB | **51.8 kB** (640w) | −24% |
| `card/doro-wat.webp` | 3-col grid, ~384w | 18.4 kB | **14.3 kB** (384w) | −22% |
| `card/bayenetu.webp` | 3-col grid, ~384w | 20.5 kB | **16.9 kB** (384w) | −18% |

Trade-off, measured rather than assumed: for a **card at 640w** the optimizer is a *regression*
(18.4 → 21.1 kB), because the source is already small and re-encoding adds overhead. That case is
avoided because the card `sizes` maps the 3-col grid to the **384w** variant, not 640w. The `sizes`
values are therefore load-bearing — if a grid layout widens, its `sizes` must be re-checked against the
table above.

The optimizer re-encodes to WebP when the client advertises it (AVIF is not produced by this Next
build), so the already-WebP sources stay WebP and only the resolution is reduced.

### Font loading

`layout.js` sets `display: "swap"` on the Geist variable font. The default was already `swap`, but it is
now explicit: text is the LCP element on the text-only routes (`/cart`, `/signin`, `/orders`), and `swap`
paints the fallback immediately rather than hiding text until the font arrives. Combined with `next/font`
(self-hosted, so no third-party font round-trip or layout-shift), the font adds no measurable LCP delay.

### Social preview images (fixed 2026-10-10)

| Route | `og:image` | Size | Verified |
| --- | --- | ---: | --- |
| `/` and every route without its own card | `https://addiseatsnext.vercel.app/opengraph-image` | 1200 × 630, 94.6 kB PNG | `200 image/png` |
| `/menu/<slug>` | `https://addiseatsnext.vercel.app/menu/<slug>/opengraph-image` | 1200 × 630, 83–89 kB PNG | `200 image/png` |

Before this fix both routes pointed at `https://www.addiseats.com/...` (a domain this project does not
control) and the generated card returned **HTTP 500** (`display: "inline-flex"` is not a valid Satori
value), which is why shared links carried no image.

---

## JS bundle sizes (production build)

| View | `/menu` script payload |
| --- | ---: |
| **Transferred (deployed, gzip/Brotli over HTTP/2)** | **156.2 kB across 12 scripts** |
| Raw uncompressed (local build, all chunks) | ~598 kB across 12 chunks |

The brief's target is < 120 kB First Load JS. The transferred figure misses it by ~36 kB; the three
largest chunks are the React 19 + Next.js 16 baseline, which cannot be removed without changing framework
or dropping a dependency. Recorded as a **miss with a cause**, which the brief accepts in preference to an
unexplained number.

Note on `optimizePackageImports`: earlier revisions of this document claimed
`optimizePackageImports: ["swr", "zod"]` was set in `next.config.mjs`. Next.js 16 (Turbopack) **removed
that key** — adding it now produces `Unrecognized key(s) in object: 'optimizePackageImports'`. Package
import optimisation is automatic in Turbopack, so the option is neither needed nor usable, and the claim
has been removed from this file and from README.md.

---

## Lighthouse measurements

**Current: see "Deployed report — 2026-10-10" at the top of this file.** The runs below are the localhost
history that documents what changed and when.

All runs: production build, Chrome DevTools / Lighthouse CLI, **simulated mobile throttling**.

### Localhost report — 2026-10-08 (superseded by the deployed report above)

| Route | Performance | Accessibility | Best Practices | SEO | LCP |
| --- | ---: | ---: | ---: | ---: | ---: |
| `/menu` | 94 | 96 | 100 | 100 | 2.7 s |
| `/menu/special-doro-wat` | 97 | 95 | 100 | n/r | 2.6 s |
| `/` | 97 | 100 | 100 | n/r | 2.2 s |

### Baseline — before any optimisation (2026-10-08, original text-only menu)

| Metric | `/menu` |
| --- | ---: |
| Performance score | 81 |
| First Contentful Paint | 1.1 s |
| Largest Contentful Paint | 1.8 s |
| Total Blocking Time | 760 ms |
| Cumulative Layout Shift | 0 |
| Accessibility / Best Practices / SEO | 96 / 96 / 100 |

*(Home and dish-detail baselines were not captured before images were added.)*

### Historical build — images added, `priority` preload fix

| Metric | `/` | `/menu` | `/menu/[slug]` |
| --- | ---: | ---: | ---: |
| Performance score | 81 | 85 | 80 |
| First Contentful Paint | 1.0 s | 1.0 s | 1.0 s |
| Largest Contentful Paint | 1.8 s | 1.8 s (was 2.4 s before the `priority` fix) | 1.8 s |
| Total Blocking Time | ~560 ms | ~700 ms | ~600 ms |
| Cumulative Layout Shift | 0 | 0 | 0 |

### Alternative browser check (different methodology — do not mix with Lighthouse)

Cold cache, 412 × 823 viewport, 4× CPU throttling, 150 ms latency, 200 kB/s downlink:

| Route | LCP |
| --- | ---: |
| `/` | 0.51 s |
| `/menu` | 0.57 s |
| `/menu/special-doro-wat` | 1.17 s |

---

## What moved between baseline and after

| Change | Effect |
| --- | --- |
| Added dish photos via `next/image` (pre-cropped WebP, `priority` on the LCP image) | Page weight ~200 kB → ~694 kB; LCP element changed from headline to photo |
| `preload` prop corrected to `priority` on the first card | LCP 2.4 s → 1.8 s on `/menu`; clears the "LCP request discovery" flag |
| Geist font via `next/font/google` | Removes the runtime font-provider request; keeps CLS at 0 |
| Pre-cropped `display/card` + `display/detail` assets with `unoptimized` | No runtime transform, no oversized download; largest image 132.7 kB |
| `prefetch={false}` on every `<Link>` | No speculative page downloads while browsing the grid |
| Root + per-dish `opengraph-image.js` | Social previews now render; **zero cost to page load** (generated on request only) |

**Attempted and reverted:** `dynamic(() => import("./FilterShell"))` to split SWR into a deferred chunk.
LCP *worsened* to 2.4 s because Lighthouse measured the skeleton placeholder instead of the first dish
image. A static import keeps the first-paint dish cards in the initial HTML — correct for LCP and for the
brief's "server data seeds the client query" requirement.

---

## Why First Load JS is structural

**156.2 kB transferred vs a 120 kB target.** The three largest chunks are the React 19 + Next.js 16
runtime; under simulated mobile throttling that baseline costs 144–220 ms of main-thread time (down from
560–760 ms on localhost once compression and the CDN are in play) regardless of how small the application
code is. Reducing it further means removing a dependency (SWR is ~14 kB) or changing framework version —
both out of scope for a build whose point is the architecture.

**LCP is no longer a miss.** The localhost runs that previously reported 2.6–2.7 s were measuring a single
local Node process with no CDN, no Brotli and no HTTP/2 — exactly what Lighthouse's worst-case simulation
models. Measured on the deployed build, all three routes land at 1.60–2.28 s against a 2.5 s target.

**What would move First Load JS, in order of payoff:**
1. Replace SWR with React's `use` hook + streamed Server Components (−~14 kB client JS).
2. Split the root layout's session check so the header hydrates independently of page content.
3. Decouple the auth UI from the root layout to re-enable static/ISR rendering of `/` and `/menu`
   (currently every route is dynamic — documented in DATA.md).

---

## Check list against the brief

| Check | Result |
| --- | --- |
| Lighthouse performance ≥ 90 | ✅ **95 / 96 / 97** on the deployed build |
| LCP < 2.5 s | ✅ **1.60 s / 2.20 s / 2.28 s** (all three routes) |
| CLS < 0.1 | ✅ 0 on all three routes |
| First Load JS `/menu` < 120 kB | ❌ 156.2 kB transferred — React 19 + Next 16 baseline, documented above |
| Largest image < 150 kB | ✅ 132.7 kB on disk (20.2 kB largest transfer) |
| Before **and** after recorded | ✅ budget table at the top |
| Measured on the deployed build | ✅ Lighthouse CLI run against `https://addiseatsnext.vercel.app` on 2026-10-10 |
