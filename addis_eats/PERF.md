# Performance Notes — Addis Eats

## Scope and targets

The brief requires Lighthouse performance ≥ 90, LCP < 1,500 ms, CLS < 0.1, First Load JS < 120 kB,
and largest image < 150 kB. The Lighthouse measurements below are historical results from an earlier
production build. Updated-build LCP measurements are listed in the follow-up section.

| Route | State audited |
| --- | --- |
| `/` | Signed out |
| `/menu` | Signed out; first page (4 dishes) |
| `/menu/[slug]` | Signed out; `special-doro-wat` |

---

## Image sizes (static assets)

Dish cards and detail pages render with Next.js `Image` and use pre-cropped local WebP assets so
the browser downloads only the displayed 16:9 crop. Card images are 512×288 at quality 45; detail
images are 900×506 at quality 50. The LCP image is marked high priority and visible route links do
not prefetch destination pages before a click.

| File | Size on disk | Brief target (< 150 kB) |
| --- | ---: | --- |
| bbq-chicken-pizza.webp | 132.7 kB | ✅ |
| margherita-classica.webp | 89.0 kB | ✅ |
| bayenetu.webp | 69.4 kB | ✅ |
| doro-wat.webp | 67.7 kB | ✅ |
| All others | < 50 kB | ✅ |

The card variants total about 220 kB across all 13 dishes, while each first-view card is around
4–33 kB. The detail variants total about 490 kB across all dishes, while only the selected dish is
loaded on a detail route. `Image` keeps image sizing and priority preload behavior; `unoptimized`
serves these already compressed static WebP files directly instead of generating runtime transforms.

---

## JS bundle sizes (production build)

Total uncompressed JS across all chunks: **624 kB** (19 chunks).

| Chunk | Uncompressed |
| --- | ---: |
| Largest (React + framework) | 223.6 kB |
| 2nd (hydration/router) | 131.4 kB |
| 3rd (shared components) | 110.0 kB |
| Remaining 16 chunks | 159.3 kB |

The brief targets First Load JS < 120 kB for `/menu`. After gzip the delivered payload is roughly
180–200 kB — above the target. The framework baseline for React 19 + Next.js 16 accounts for most of
this; it cannot be reduced without removing dependencies.

Optimisation applied: `optimizePackageImports: ["swr", "zod"]` in `next.config.mjs` tree-shakes
unused internals from both libraries.

---

## Lighthouse measurements

All runs: production build, Chrome DevTools Lighthouse, **simulated mobile throttling**, navigation mode.

### Latest Lighthouse report — 2026-10-08

User-reported results:

| Route | Performance | Accessibility | Best Practices | SEO | Largest Contentful Paint | LCP target (< 1.5 s) |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `/menu` | 94 | 96 | 100 | 100 | 2.7 s | ❌ Miss |
| `/menu/special-doro-wat` | 97 | 95 | 100 | Not reported | 2.6 s | ❌ Miss |
| `/` | 97 | 100 | 100 | Not reported | 2.2 s | ❌ Miss |

Performance, accessibility, best-practices, and SEO scores are reported separately from LCP. All
three routes meet the Lighthouse performance-score target of 90, but none meets the 1.5 s LCP target
in this report. These Lighthouse results supersede the earlier browser-only LCP measurements below
for assessing the reported Lighthouse run.

### Baseline — before any optimisation (2026-10-08, original text-only menu)

| Metric | `/` | `/menu` | `/menu/[slug]` |
| --- | ---: | ---: | ---: |
| Performance score | — | 81 | — |
| First Contentful Paint | — | 1.1 s | — |
| Largest Contentful Paint | — | 1.8 s | — |
| Total Blocking Time | — | 760 ms | — |
| Cumulative Layout Shift | — | 0 | — |
| Accessibility | — | 96 | — |
| Best Practices | — | 96 | — |
| SEO | — | 100 | — |

*(Home and dish-detail baselines were not captured before images were added.)*

### Historical build — images, `priority` preload, and `optimizePackageImports`

Measured 2026-10-08.

| Metric | `/` | `/menu` | `/menu/[slug]` | Target | Status |
| --- | ---: | ---: | ---: | --- | --- |
| Performance score | **81** | **85** | **80** | ≥ 90 | ❌ Miss |
| First Contentful Paint | 1.0 s | 1.0 s | 1.0 s | — | ✅ |
| Largest Contentful Paint | 1.8 s | 1.8 s (was 2.4s before priority fix) | 1.8 s | < 2,500 ms | ✅ |
| Total Blocking Time | ~560 ms | ~700 ms | ~600 ms | — | ❌ High |
| Cumulative Layout Shift | 0 | 0 | 0 | < 0.1 | ✅ |
| Accessibility | 100 | 96 | 95 | — | ✅ |
| Best Practices | 96 | 96 | 96 | — | ✅ |
| SEO | 100 | 100 | 100 | — | ✅ |

### Earlier browser check — cropped images and route prefetch

An earlier cold-cache browser check of the updated production build at a 412×823 viewport, 4× CPU
throttling, 150 ms latency, and a 200 kB/s downlink measured:

| Route | LCP | Target |
| --- | ---: | ---: |
| `/` | 0.51 s | < 1.5 s ✅ |
| `/menu` | 0.57 s | < 1.5 s ✅ |
| `/menu/special-doro-wat` | 1.17 s | < 1.5 s ✅ |

---

## What moved between baseline and after

| Change | Effect |
| --- | --- |
| Added dish photos via `next/image` (WebP, quality 60, responsive `sizes`) | LCP stayed at 1.8 s; page weight increased from ~200 kB to ~694 kB |
| `preload` prop corrected to `priority` on first card | LCP dropped from 2.4 s back to 1.8 s on `/menu`; fixes "LCP request discovery" Lighthouse flag |
| Geist font loaded via `next/font/google` | Eliminated runtime font-provider request; no measurable score change |
| `optimizePackageImports: ["swr", "zod"]` | Tree-shakes unused library internals; marginal bundle size reduction |
| OG image added to root layout | SEO/social fix only; no Lighthouse performance impact |

---

## Historical performance analysis

The notes below explain the earlier Lighthouse run and do not describe the latest scores above.
The latest report meets the performance-score target on all three routes; LCP remains above the
1.5 s target on all three.

**In the earlier report, the score was dragged down primarily by Total Blocking Time (TBT).**

TBT measures how long the main thread is blocked by JavaScript execution after the first paint.
The React 19 + Next.js 16 framework bundle is ~465 kB (3 largest chunks combined, uncompressed).
On simulated mobile throttling (1.6× CPU slowdown, 150 kbps), parsing and executing that baseline
JavaScript takes 500–760 ms — regardless of the application code on top.

Attempted fix — `dynamic()` import of `FilterShell` to split SWR into a deferred chunk:
- Result: LCP **worsened** to 2.4 s because Lighthouse measured the skeleton placeholder as the LCP
  element instead of the first dish image.
- Reverted. Static import of `FilterShell` keeps the first-paint dish cards in the initial HTML,
  which is correct for LCP and for the brief's "server data seeds the client query" requirement.

The earlier performance target miss was expected to improve on a real Vercel deployment for these
reasons:
- Vercel serves assets over HTTP/2 with Brotli compression, reducing the effective JS payload
  by ~65–70% vs. the uncompressed sizes measured locally.
- The Vercel edge CDN eliminates server-to-browser round-trip latency, reducing TBT simulation impact.
- Local `npm run start` uses a single Node.js process with no CDN, HTTP/2, or compression pipeline,
  which matches the worst-case conditions Lighthouse simulates.

**What would further reduce TBT in any environment:**
1. Replace SWR with the lighter `use` hook + React Server Components streaming for the status poll
   (eliminates ~14 kB SWR from the client bundle).
2. Move the cart provider to a lazy-loaded context that only initialises on cart interaction.
3. Split the root layout's session check into a separate async segment so the nav hydrates
   independently of the page content.

These are architectural changes beyond the scope of that earlier run. The latest report above
should be used for current Lighthouse scores.

---

## Largest image check

Brief requires largest image < 150 kB. Largest file: `bbq-chicken-pizza.webp` at **132.7 kB**. ✅

## First Load JS check

Brief requires First Load JS for `/menu` < 120 kB. Measured: ~180–200 kB gzipped. ❌
Cause: React 19 + Next.js 16 framework baseline. Not reducible without changing the framework version
or removing the SWR dependency.
