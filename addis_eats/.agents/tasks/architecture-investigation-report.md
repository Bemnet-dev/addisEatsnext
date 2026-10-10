# Addis Eats — Architecture Investigation Report

> **Scope:** Read-only investigation of `d:\VS\addisEatsnext\addis_eats\src`.  
> **Task:** Document where and how five concerns are implemented: Error Catching, SEO, LCP/Performance, Auth Structure, and SWR/Data Fetching.

---

## 1. Error Catching

### Summary

Error handling uses **four layers**: Next.js `error.js` error boundaries (client-side reset UI), `not-found.js` 404 pages, Server Action explicit return objects (no thrown exceptions), and API route `try/catch` with structured JSON error responses. There is **no global `window.onerror` or React `componentDidCatch` class boundary** beyond what Next.js generates from `error.js`.

---

### Where and How

#### 1.1 — Root error boundary (`src/app/error.js`)

```js
// src/app/error.js  — lines 1–18
"use client";

export default function Error({ error, reset }) {
  return (
    <div className="py-12 text-center">
      <h2 ...>Something went wrong</h2>
      <p ...>{error.message}</p>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

- Scope: all routes that are not inside the `/menu` segment.
- The `reset()` callback re-renders the segment; `error.message` is displayed directly (potential information leak in production).
- No logging or error-reporting service call.

#### 1.2 — Menu segment error boundary (`src/app/menu/error.js`)

Identical pattern to root, scoped to the `/menu` subtree. `error.message` is again displayed verbatim.

#### 1.3 — Not-found pages

| File | Route scope |
|------|-------------|
| `src/app/not-found.js` | All routes |
| `src/app/menu/not-found.js` | `/menu/[slug]` |

`notFound()` is called explicitly in:
- `src/app/menu/[slug]/page.jsx` when the slug resolves to no dish
- `src/app/orders/[id]/page.js` when the order is missing or not owned by the session

#### 1.4 — Server Action error returns (`src/app/actions.js`)

Server Actions never `throw`; they return plain objects:

```js
// signIn (line 22–40)
if (!account) return { error: "Invalid credentials." };

// placeOrder (line 51)
if (!session) return { error: "Please sign in before placing an order." };
if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

// cancelOrder (line 66)
if (!session) return { error: "You must be signed in to cancel an order." };
if (!owned)   return { error: "You don't own this order." };
```

The `try/catch` in `placeOrder` (lines 56–60) only guards a `JSON.parse` call for the cart items, not the whole action.

#### 1.5 — API route error handling

`src/app/api/orders/route.js` has an explicit `try/catch` around `request.json()`:

```js
try {
  body = await request.json();
} catch {
  return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
}
```

All API routes return structured JSON with HTTP status codes (400, 401, 404, 422). No route has a catch-all for unexpected errors.

#### 1.6 — SWR client error surface (`src/app/menu/FilterShell.jsx`)

```jsx
{error ? (
  <p className="...">Could not load dishes. Try again in a moment.</p>
) : null}
```

SWR `error` state is caught and renders a message but does not call `reset()` or retry manually.

---

### Gaps

| Gap | Risk |
|-----|------|
| `error.message` displayed verbatim in both error boundaries | Leaks internal error strings to users in production |
| No logging/reporting (Sentry, etc.) | Silent failures — no observability beyond browser console |
| No `try/catch` wrapper in Server Actions for unexpected DB/IO errors | An unhandled throw would bubble to the error boundary without a structured response |
| API routes have no catch-all for unexpected errors | Unhandled errors return a raw 500, not a JSON error object |
| SWR error handling in `FilterShell` has no retry button | Users must refresh the entire page |

---

## 2. SEO

### Summary

SEO is well-covered. The app uses static `metadata` exports on most pages, `generateMetadata` for dynamic dish pages, Open Graph and Twitter Card tags, a `robots.js` file, a dynamic `sitemap.js`, a generated `opengraph-image.js` for per-dish OG images, and JSON-LD structured data on dish detail pages. The main gap is that several private routes (checkout, orders, kitchen) expose no metadata at all — search engines won't index them, but a missing `<title>` could hurt browser-tab UX.

---

### Where and How

#### 2.1 — Global metadata (`src/app/layout.js`, lines 11–54)

```js
export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.addiseats.com"),
  applicationName: "Addis Eats",
  title: { default: "Addis Eats", template: "%s | Addis Eats" },
  description: "Authentic Ethiopian cuisine...",
  keywords: ["Addis Eats", "Ethiopian restaurant", ...],
  openGraph: { title, description, siteName, type: "website", images: [...] },
  twitter: { card: "summary_large_image", title, description },
};
```

All child pages inherit this and override `title` / `description` only.

#### 2.2 — Per-page static metadata

| File | title | description |
|------|-------|-------------|
| `src/app/page.js` | "Home" | ✅ |
| `src/app/menu/page.js` | "Menu" | ✅ |
| `src/app/orders/page.js` | "My Orders" | ✅ |
| `src/app/checkout/page.js` | "Checkout" | ✅ |
| `src/app/kitchen/page.js` | "Kitchen" | ✅ |
| `src/app/cart/page.js` | "Cart" | ✅ |

#### 2.3 — Dynamic metadata for dish pages (`src/app/menu/[slug]/page.jsx`, lines 17–55)

```js
export async function generateMetadata({ params }, parent) {
  const dish = dishes.find((d) => toSlug(d.name) === slug);
  return {
    title: dish.name,
    description: `${dish.name} — ${dish.description}`,
    alternates: { canonical: `/menu/${slug}` },
    openGraph: { type: "article", url, title, description, images: [{ url, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images },
  };
}
```

Canonical URLs are set per dish. Falls back to `parent` metadata if the dish is not found.

#### 2.4 — Robots (`src/app/robots.js`)

```js
rules: {
  userAgent: "*",
  allow: ["/", "/menu"],
  disallow: ["/api", "/signin", "/orders", "/checkout", "/cart", "/kitchen"],
},
sitemap: "https://www.addiseats.com/sitemap.xml"
```

Only public marketing pages are crawlable.

#### 2.5 — Sitemap (`src/app/sitemap.js`)

Dynamically generates entries for `/`, `/menu`, and all 13 dish slugs with `changeFrequency` and `priority` values. Uses `getDishes()` at build time.

#### 2.6 — Per-dish OG image (`src/app/menu/[slug]/opengraph-image.js`)

Uses `next/og` (`ImageResponse`) to generate a 1200×630 image with the dish name, description, category, and price as styled text on a dark gradient. No photo included — text-only card.

#### 2.7 — JSON-LD structured data (`src/app/menu/[slug]/page.jsx`, lines 58–74)

```js
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "MenuItem",
  name, description, image, category,
  offers: { "@type": "Offer", priceCurrency: "ETB", price, availability: "InStock" },
};
// Injected via: <script type="application/ld+json" dangerouslySetInnerHTML=... />
```

---

### Gaps

| Gap | Impact |
|-----|--------|
| No `<link rel="canonical">` on the root `/` and `/menu` pages | Minor; usually not needed for index pages but canonical is missing |
| OG image is text-only — no actual dish photo in the social card | Social share previews look generic |
| No `Restaurant` or `FoodEstablishment` JSON-LD on the homepage | Misses rich result eligibility for the restaurant entity itself |
| No `description` on `src/app/signin/page.js` | Signin page has no metadata export at all |

---

## 3. LCP / Performance

### Summary

Performance optimization is thorough and well-documented in `PERF.md`. The key techniques are: `next/image` with pre-cropped WebP assets, explicit `priority` / `fetchPriority="high"` on the LCP image, `next/font/google` for font loading, `optimizePackageImports` for tree-shaking, `revalidate = 3600` ISR on `/menu`, SSG on all dish pages, route-level Suspense via `loading.js`, and `prefetch={false}` on all nav links. The documented LCP (2.2–2.7 s on simulated mobile) does not meet the 1.5 s brief target.

---

### Where and How

#### 3.1 — Next.js Image with pre-cropped variants (`src/app/menu/DishCard.jsx`, `src/app/menu/[slug]/page.jsx`)

```jsx
// DishCard.jsx
<Image
  src={getDishCardImage(dish.image)}   // → /dishes/display/card/doro-wat.webp (512×288)
  width={512} height={288}
  unoptimized          // serve pre-compressed WebP directly
  priority={priority}  // true only for index=0 (first card = LCP candidate)
  fetchPriority={priority ? "high" : undefined}
  className="aspect-[16/9] w-full object-cover"
/>

// [slug]/page.jsx
<Image
  src={getDishDetailImage(dish.image)}  // → /dishes/display/detail/doro-wat.webp (900×506)
  width={900} height={506}
  unoptimized
  priority                              // always high — this IS the LCP element
  fetchPriority="high"
/>
```

The `getDishCardImage` and `getDishDetailImage` helpers in `src/lib/dishes.js` rewrite the path to pre-cropped subdirectories (`/dishes/display/card/` and `/dishes/display/detail/`).

#### 3.2 — Font loading (`src/app/layout.js`, lines 8–11)

```js
import { Geist } from "next/font/google";
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
```

`next/font/google` inlines font-face CSS and self-hosts the font files, eliminating a third-party font request and its render-blocking potential.

#### 3.3 — ISR on menu page (`src/app/menu/page.js`, line 7)

```js
export const revalidate = 3600;
```

The menu page is served from cache and revalidated at most once per hour. As noted in `DATA.md`, the root layout's `getSession()` cookie read currently forces the route dynamic, preventing this from taking effect at runtime.

#### 3.4 — SSG on dish detail pages (`src/app/menu/[slug]/page.jsx`, lines 13–16)

```js
export async function generateStaticParams() {
  const dishes = await getDishes();
  return dishes.map((dish) => ({ slug: toSlug(dish.name) }));
}
```

All 13 dish pages are pre-built at compile time.

#### 3.5 — `next.config.mjs`

```js
const nextConfig = {
  images: { qualities: [60, 75] },
};
```

Limits the image quality steps generated by the Next.js Image Optimization API. Only two entries, which slightly reduces cache surface. `optimizePackageImports` is mentioned in `PERF.md` but is **not present** in the current `next.config.mjs` — it was apparently reverted or not committed.

#### 3.6 — Route-level Suspense via `loading.js`

- `src/app/loading.js` — generic loading text for root
- `src/app/menu/loading.js` — detailed skeleton (search bar, category chips, 4 card placeholders) that matches the menu layout exactly, stabilising CLS

#### 3.7 — No `<Link prefetch>` (`src/app/layout.js` and all pages)

Every `<Link>` sets `prefetch={false}`, preventing speculative prefetching of page data before the user clicks. This reduces wasted bandwidth on the menu grid.

#### 3.8 — `force-dynamic` on checkout (`src/app/checkout/page.js`)

```js
export const dynamic = "force-dynamic";
```

Prevents the checkout page from being accidentally cached.

#### 3.9 — Client boundary pushed down (cart page pattern)

`src/app/cart/page.js` is a server component; only `CartItems.jsx` is `"use client"`. The comment in the file explains the intent: "Moving 'use client' down the tree keeps this page's server-rendered HTML in the initial payload and reduces the JS the browser must parse before becoming interactive (TBT)."

---

### Gaps / Known Issues (from PERF.md)

| Issue | Detail |
|-------|--------|
| LCP 2.2–2.7 s on simulated mobile | Does not meet the 1.5 s brief target on all three tested routes |
| First Load JS ~180–200 kB gzipped | Exceeds 120 kB brief target; caused by React 19 + Next.js 16 baseline |
| `optimizePackageImports` not in current `next.config.mjs` | Referenced in PERF.md but absent from the config file |
| Root layout `getSession()` prevents ISR on `/menu` | Cookie read makes the route dynamic, defeating `revalidate = 3600` |
| TBT 500–760 ms on simulated mobile | Framework JS parse time on slow CPU; no application-level fix available without changing dependencies |

---

## 4. Auth Structure

### Summary

Authentication is **stateless cookie-based sessions** with HMAC-SHA-256 signing via the Web Crypto API. There is no NextAuth, Clerk, or external provider. Protection is applied at three independent layers per private route: middleware (`src/proxy.js`), page-level `requireSession()`, and server action / API route session checks. The system is a demo with hardcoded credentials and no user registration.

---

### Where and How

#### 4.1 — Session token (`src/lib/session-token.js`)

```js
export async function createSessionToken({ name, role }) {
  const payload = base64url(JSON.stringify({ name, role, expiresAt: Date.now() + 7days }));
  return `${payload}.${await sign(payload)}`;  // HMAC-SHA-256
}

export async function verifySessionToken(token) {
  // 1. Split on "." — must have exactly two parts
  // 2. Re-sign the payload and constant-time compare signatures
  // 3. Parse JSON, check name/role types and expiresAt > now
  return session | null;
}
```

Constant-time comparison (`difference |= (a[i] ?? 0) ^ (b[i] ?? 0)`) prevents timing attacks.

#### 4.2 — Session cookie (`src/lib/session.js`)

```js
cookieStore.set({
  name: SESSION_COOKIE,   // "session"
  value: await createSessionToken(session),
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,  // 7 days
});
```

`requireSession(nextPath)` is the convenience helper used by page server components — it calls `getSession()` and returns `{ session, redirectTo }`.

#### 4.3 — Middleware (`src/proxy.js`)

The file exports a `proxy` function and a `config` matcher:

```js
export const config = {
  matcher: ["/signin", "/checkout/:path*", "/orders/:path*", "/kitchen/:path*"],
};
```

Logic:
1. Signed-in user hits `/signin` → redirect to `next` param (or `/orders`).
2. Unauthenticated user hits `/checkout` or `/orders/*` → redirect to `/signin?next=...`.
3. Any user hits `/kitchen/*` → if no session, redirect to signin; if session but `role !== "staff"`, redirect to `/orders`.

The open-redirect vector is closed by `sanitizeNextPath()` (duplicated here from `session.js`).

> **Note:** The middleware file is `src/proxy.js`, not `src/middleware.js`. It must be imported/registered somewhere to run — this is a naming deviation from Next.js convention. `next.config.mjs` does not import it, and there is no `src/middleware.js`. This is a potential gap — the middleware may not be active unless `proxy.js` is re-exported from `middleware.js`.

#### 4.4 — Server actions (`src/app/actions.js`)

| Action | Auth check | Authorization check |
|--------|-----------|---------------------|
| `signIn` | — | Credential match against `DEMO_ACCOUNTS` |
| `signOut` | — | Clears cookie unconditionally |
| `placeOrder` | `getSession()` → error if null | `customerName` overwritten with `session.name` |
| `cancelOrder` | `getSession()` → error if null | `session.role !== "staff" && order.customerName !== session.name` |

#### 4.5 — API routes

| Route | Auth check | Authorization |
|-------|-----------|---------------|
| `POST /api/orders` | `getSession()` → 401 | `body.customerName = session.name` (overwrite) |
| `GET /api/orders/[id]` | `getSession()` → 401 | `order.customerName !== session.name` → 404 |

#### 4.6 — Demo credentials (hardcoded in `actions.js`, lines 14–17)

```js
const DEMO_ACCOUNTS = [
  { name: "Abebe Kebede", password: "addis123", role: "customer" },
  { name: "Kitchen Staff", password: "kitchen123", role: "staff" },
];
```

No hashing, no registration, no session revocation beyond cookie deletion.

---

### Gaps

| Gap | Risk |
|-----|------|
| `src/proxy.js` — not the conventional `middleware.js` name | Middleware may not run at all if not re-exported; this needs verification |
| No password hashing | Demo-only; not acceptable for production |
| No server-side session revocation | Signed-out token remains valid for 7 days |
| `AUTH_SECRET` fallback to hardcoded dev string | If env var is unset in staging, sessions are signed with a known key |
| `sanitizeNextPath` duplicated in both `proxy.js` and `session.js` | Logic drift risk if one is updated |
| No `cart` or `kitchen` route listed in `isPrivateRoute()` | Cart is not gated; kitchen gating is a separate `if` block, not part of `isPrivateRoute` |

---

## 5. SWR / Data Fetching

### Summary

The app uses a **"server seeds, client polls"** hybrid strategy. Public, cacheable data (menu, dish list) is fetched on the server; user-specific data (orders) is server-rendered per request; interaction-driven reads (search, live order status) use SWR on the client. There is no React Query; SWR (`swr@^2.3.6`) is the only client data library.

---

### Where and How

#### 5.1 — Server-side data fetching

**Menu page** (`src/app/menu/page.js`):
```js
export const revalidate = 3600;

export default async function MenuPage() {
  const dishes = await getDishes();  // → returns static array from dishes.js
  return <FilterShell dishes={dishes} />;
}
```

`getDishes()` (`src/lib/dishes.js`) returns a hardcoded array synchronously (wrapped in `async` for future DB compatibility). No `fetch()` calls, so no HTTP caching headers apply. The server component result is subject to the `revalidate = 3600` directive.

**Dish detail page** (`src/app/menu/[slug]/page.jsx`): Same `getDishes()` call at request time (or from static generation at build time via `generateStaticParams`).

**Orders page** (`src/app/orders/page.js`):
```js
const orders = getOrders().filter((order) =>
  session.role === "staff" || order.customerName === session.name
);
```

No `revalidate`; rendered fresh per request (dynamic). Data is in-memory (`src/lib/orders.js` — a module-level array).

#### 5.2 — SWR for menu search (`src/app/menu/FilterShell.jsx`)

```js
const searchKey = searchValue
  ? `/api/dishes?search=${encodeURIComponent(searchValue)}&page=${safePage}`
  : null;  // null key → SWR does not fetch

const { data, isLoading, error } = useSWR(searchKey, fetcher, {
  fallbackData: { dishes: initialDishes, totalPages: ..., totalItems: ... },
  keepPreviousData: true,
});
```

- Key is `null` when there is no search term → SWR is inert, initial server data is displayed.
- When a search term exists (debounced 350 ms), SWR fetches `/api/dishes?search=...`.
- `fallbackData` is the server-seeded dish list — no loading spinner on initial render.
- `keepPreviousData: true` prevents flickering between pages.

#### 5.3 — SWR for live order status (`src/app/orders/[id]/OrderStatusClient.jsx`)

```js
const { data, isLoading } = useSWR(`/api/orders/${order.id}`, fetcher, {
  fallbackData: order,          // server-rendered order, no initial spinner
  revalidateOnFocus: false,     // don't re-fetch when window regains focus
  refreshInterval: (latestOrder) =>
    latestOrder && ["delivered", "cancelled"].includes(latestOrder.status)
      ? 0        // stop polling on terminal status
      : 5000,    // poll every 5 s while active
});
```

The dynamic interval stops the poll when the order is in a terminal state.

#### 5.4 — The `fetcher` utility (`src/lib/fetcher.js`)

```js
export async function fetcher(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
  return response.json();
}
```

`cache: "no-store"` ensures SWR always gets live data. Errors are thrown as `Error` objects so SWR's `error` state is populated.

#### 5.5 — Cart state (no fetching)

Cart lives in React state (`src/lib/providers.jsx`) — `useState([])` with `addToCart`, `removeFromCart`, `clearCart` callbacks. No server persistence, no SWR. Cart is lost on page refresh.

#### 5.6 — Server Actions as write path

`placeOrder` and `cancelOrder` in `src/app/actions.js` are the write path. After writing:
```js
revalidatePath("/orders");   // invalidates /orders ISR cache
redirect(`/checkout/success?id=${order.id}`);
```

`revalidatePath("/orders")` is called after both `placeOrder` and `cancelOrder`.

#### 5.7 — `revalidate` directives summary

| File | Directive | Effect |
|------|-----------|--------|
| `src/app/menu/page.js` | `export const revalidate = 3600` | ISR: rebuild at most every hour |
| `src/app/checkout/page.js` | `export const dynamic = "force-dynamic"` | Always server-render |
| `src/app/menu/[slug]/page.jsx` | `generateStaticParams` (no revalidate) | SSG: built once at deploy |
| All others | none | Next.js default (dynamic if cookies/headers read) |

---

### Gaps

| Gap | Impact |
|-----|--------|
| `getDishes()` returns a hardcoded array, not a real fetch | `revalidate = 3600` has no real effect since there is no external data source to re-fetch |
| Orders stored in a module-level array | Lost on process restart; not shared across serverless instances |
| Cart not persisted (localStorage, cookie, or server) | Cart is cleared on page refresh |
| `revalidatePath("/orders")` on `cancelOrder` does not trigger UI update | Because `/orders` is dynamically rendered (no ISR), the call is a no-op for cache purposes |
| No SWR global config / `SWRConfig` provider | Each SWR call uses library defaults; no shared error handler or retry policy |
| Dish item prices not validated server-side against canonical data | `placeOrder` accepts any submitted price; a user could send `price: 1` (noted in STRATEGY.md) |

---

## Conclusions

The app is a well-structured Next.js demo that covers all five concerns with real, working code. The most significant issues by concern:

| Concern | Status | Key Gap |
|---------|--------|---------|
| Error Catching | Functional | `error.message` leaked in UI; no observability; no catch-all in API routes |
| SEO | Strong | Missing restaurant JSON-LD on homepage; text-only OG images |
| LCP / Performance | Good scores, LCP target missed | 2.2–2.7 s LCP vs 1.5 s target; `optimizePackageImports` not in config; ISR blocked by root layout session check |
| Auth Structure | Solid design, demo-grade secrets | Verify `proxy.js` is actually registered as middleware; no password hashing; no revocation |
| SWR / Data Fetching | Clean pattern | Cart not persisted; item prices not re-validated server-side; `revalidatePath` call on dynamic route is a no-op |

### Priority Recommendations

1. **Verify middleware registration** — confirm `src/proxy.js` is wired up as Next.js middleware (should be at `src/middleware.js` or imported from there). All auth gating depends on it.
2. **Fix `error.message` exposure** — in both `error.js` files, replace `{error.message}` with a generic user-facing string and log the real error server-side.
3. **Re-validate dish prices in `placeOrder`** — reload canonical dish data and check submitted `price` values before creating the order.
4. **Add `optimizePackageImports`** to `next.config.mjs` if it was intentionally removed; the PERF.md says it should be there.
5. **Decouple session check from root layout** to re-enable ISR on `/menu` — move the `getSession()` call out of the root layout or into a parallel route.
