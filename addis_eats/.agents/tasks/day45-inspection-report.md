# Day 45 Inspection Report

**Project:** Addis Eats — `d:\IBT\sq2-bemnet-yitagesu\module-03-react-nextjs\Days\Day_45\addis_eats`  
**Inspected:** All source files, markdown documents, and public assets  
**Verdict summary:** 4 of 6 technical areas pass, 2 fail. Documents partially meet requirements. Several security properties are solid; performance documentation is the weakest area.

---

## Area 1: Accounts — PASS

### What is implemented correctly

- **HMAC-SHA-256 signed token** implemented in `src/lib/session-token.js`. Token is `base64url(payload).base64url(HMAC-SHA256(payload))` where payload contains `{ name, role, expiresAt }`.
- **Constant-time comparison** is used in `verifySessionToken` (XOR loop over byte arrays), preventing timing attacks.
- **HttpOnly cookie** set in `src/lib/session.js` with `httpOnly: true`, `sameSite: "lax"`, `secure: true` in production.
- **7-day session** via `maxAge: 60 * 60 * 24 * 7`.
- **Sign-in** (`signIn` action in `src/app/actions.js`) validates credentials against `DEMO_ACCOUNTS`, calls `setSession`, and redirects to sanitized `next`.
- **Sign-out** (`signOut` action) calls `clearSession()` then redirects to `/signin`.
- **`AUTH_SECRET` env guard**: `session-token.js` throws if `AUTH_SECRET` is missing in production; uses `DEVELOPMENT_SECRET` fallback only in dev.
- **`.env.example`** documents the required variable without including a real secret.

### Minor issues

- The `sanitizeNextPath` function is duplicated — defined identically in both `src/lib/session.js` and `src/proxy.js`. Not a security problem, but a maintenance concern.
- `SignInPage` (`src/app/signin/page.js`) passes the raw `next` query parameter directly as `nextPath` prop to the form without sanitizing it first. The sanitization happens in the `signIn` server action, so the value is safe before redirect — but an unsanitized value is embedded as a hidden form field and visible to the browser. Low risk, but the defense relies entirely on the action-layer sanitization.
- Session is stateless: sign-out only deletes the browser cookie. A copied token remains valid until its 7-day expiry. AUTH.md acknowledges this limitation.

### AUTH.md coverage

AUTH.md documents sign-in/sign-out, HttpOnly cookie, HMAC signing, `next` path validation, and the stateless limitation. It covers the three attacks (see the Three Attacks section below). **PASS** for documentation.

---

## Area 2: Protection — PASS

### Three-layer model

The brief requires three independent layers per protected route:
1. **Middleware** (proxy) — proves a syntactically valid, unexpired, correctly-signed cookie exists.
2. **Page-level check** — re-reads the cookie and verifies the session in server-rendered logic (not relying on middleware having already run).
3. **Action/API-level check** — each mutating or data-reading handler checks the session independently.

### Per-route protection table

| Route | Layer 1: Middleware proves | Layer 2: Page proves | Layer 3: Action/API proves |
|---|---|---|---|
| `/checkout` | Cookie is valid, signed, unexpired | `requireSession` in `checkout/page.js` — if no session, redirect | `placeOrder` action calls `getSession()` and returns error if null |
| `/orders` | Cookie is valid, signed, unexpired | `requireSession` in `orders/page.js` — if no session, redirect | N/A (read-only page; no mutation action on this page itself) |
| `/orders/[id]` | Cookie is valid, signed, unexpired (via `/orders/:path*`) | `requireSession` in `orders/[id]/page.js` — if no session, redirect; also checks ownership | `GET /api/orders/[id]` checks session and ownership |
| `/kitchen` | Cookie is valid, signed, unexpired; role === "staff" enforced | `requireSession` + `role !== "staff"` check in `kitchen/page.js` | No mutation actions on kitchen yet |

### What each layer actually proves

- **Middleware** (`src/proxy.js`): calls `verifySessionToken` — this DOES verify the HMAC signature and expiry. It is NOT just a cookie-exists check; it fully validates the token. This is stronger than a typical middleware that only checks cookie presence.
- **Page layer**: calls `requireSession()` which calls `getSession()` → `verifySessionToken`. Independently re-verifies signature and expiry. For `/orders/[id]`, also checks `order.customerName === session.name`.
- **Action/API layer**: `placeOrder`, `cancelOrder`, `POST /api/orders`, and `GET /api/orders/[id]` all call `getSession()` independently.

### Gaps found

1. **`cancelOrder` has no middleware guard.** The middleware matcher (`/signin`, `/checkout/:path*`, `/orders/:path*`, `/kitchen/:path*`) does not include a server-action path. However, server actions are called via POST to the page's route, and the action itself checks `getSession()`, so the action-layer check is the effective guard. This is acceptable but worth noting.

2. **`/api/orders` (POST)** is not in the middleware matcher. The route handler itself calls `getSession()` — so Layer 3 is present, but Layers 1 and 2 are missing (it's an API route, not a page, so Layer 2 is N/A by design; Layer 1 absence means a signed-out client can reach the handler, which correctly returns 401).

3. **No metadata on `/orders`, `/orders/[id]`, `/checkout`, `/kitchen` pages** — these pages have no `export const metadata`. Not a security gap but a missing feature for the brief's Discovery area.

---

## Area 3: Ownership — PASS

### What is implemented correctly

- **`/orders` page** (`src/app/orders/page.js`): filters with `session.role === "staff" || order.customerName === session.name`. Staff see all; customers see only their own.
- **`/orders/[id]` page** (`src/app/orders/[id]/page.js`): checks `session.role !== "staff" && order.customerName !== session.name` → calls `notFound()`. Order ID is taken from the URL `params`, but the ownership check ensures a customer cannot view another user's order by guessing an ID.
- **`GET /api/orders/[id]`** (`src/app/api/orders/[id]/route.js`): independently checks ownership — returns 404 (not 403, which avoids confirming order existence to unauthorized callers).
- **`cancelOrder` action** (`src/app/actions.js`): checks `session.role !== "staff" && order.customerName !== session.name` → returns `{ error: "You don't own this order." }`. The action does NOT trust the `orderId` it was handed for identity — it uses it only as a lookup key, then validates ownership against the session.
- **`placeOrder` action**: overwrites `customerName` with `session.name` (`raw.customerName = session.name`), so a forged customerName in the form data is ignored.
- **`POST /api/orders`**: same — `body.customerName = session.name` before validation.

### Minor issue

- Order lookup in `cancelOrder` uses `orders.find((o) => o.id === orderId)` from the module-level `orders` array (not `getOrderById`). This works but is inconsistent — `getOrderById` is available and would be cleaner.
- Item prices are not re-validated against canonical dish data. A submitted `items` array with manipulated prices will pass schema validation (only structure is checked, not price correctness). STRATEGY.md acknowledges this explicitly.

---

## Area 4: Live Data — PASS

### Polled query — PASS

- `OrderStatusClient.jsx` uses `useSWR` with `refreshInterval` of 5000ms (stops polling when status is `delivered` or `cancelled`).
- **Server seed**: the parent page (`orders/[id]/page.js`) fetches `getOrderById(id)` on the server and passes the result as the `order` prop to `OrderStatusClient`. Inside the client component, `fallbackData: order` is passed to `useSWR`. This means the first render shows server data without a loading spinner. ✓

### Debounced search — PASS

- `FilterShell.jsx` implements `useDebouncedValue(searchTerm, 350)` using `useEffect` + `clearTimeout`. The SWR key `searchKey` is only set when `debouncedSearch.trim()` is non-empty — so network requests fire only after 350ms of typing inactivity, not on every keystroke. ✓
- **Server seed**: `FilterShell` receives `dishes: initialDishes` from the server page and uses `fallbackData: { dishes: initialDishes, ... }` in `useSWR`. ✓
- **Network-level debouncing** is confirmed: the SWR key (`searchKey`) is `null` until debounced value exists, meaning SWR will not fire a fetch until the debounced term stabilizes.

### Minor detail

- When there is no search term (`searchKey` is `null`), SWR uses `fallbackData` and never makes a network request. Filtering then happens client-side on the `initialDishes`. The API endpoint (`/api/dishes?search=...`) is only called when debounced search text is present. This is correct behavior per the brief.

---

## Area 5: Performance — FAIL

### What PERF.md contains

PERF.md documents a before/after table for `/menu` only, with both columns filled:

| Metric | Before | After | Change |
|---|---|---|---|
| Lighthouse score | 0.95 | 0.90 | -0.05 |
| LCP | 2,794 ms | 3,479 ms | +685 ms |
| CLS | 0.000 | 0.000 | 0 |
| FCP | 781 ms | 826 ms | +45 ms |
| TBT | 60 ms | 110 ms | +50 ms |
| Page weight | 201,793 B | 694,777 B | +493 kB |

### Issues against the brief's targets

1. **LCP target not met.** Brief requires LCP < 2,500 ms. The "after" measurement is 3,479 ms — exceeding the target by ~1 second. The before measurement (text-only menu) was also above target at 2,794 ms. PERF.md acknowledges the tradeoff ("full-photo menu increases page weight and worsens LCP"), but does not provide a path to meeting the < 2,500 ms target.

2. **Lighthouse score regression.** Score dropped from 0.95 to 0.90. Brief requires ≥ 90 (score 0.90 = exactly 90, which technically meets the floor). This is borderline.

3. **Page weight exceeds 120 kB.** Brief requires First Load JS < 120 kB. PERF.md reports transferred page weight of 694,777 bytes (~679 kB), but this is total transferred page weight, not First Load JS. The actual JS bundle size is not documented. However, the large page weight is a concern.

4. **Only `/menu` is measured.** PERF.md explicitly lists all other routes as "Not yet measured." The brief expects measurements for the targeted routes.

5. **Largest image check.** Brief requires largest image < 150 kB. Actual largest image is `bbq-chicken-pizza.webp` at 132.7 kB. ✓ (This passes.) All images are under 150 kB.

6. **`next/image` is used correctly:** `DishCard.jsx` uses `<Image>` with `width`, `height`, `sizes`, `quality={60}`, and `preload={index === 0}` for the first card. WebP format is used. ✓

7. **Font optimization:** Geist loaded via `next/font/google` in `layout.js`, avoiding runtime font requests. ✓

8. **No third-party scripts** confirmed (no `<Script>` tags in any layout). ✓

### What is missing

- No documented "before" and "after" for `/`, `/menu/[slug]`, `/orders`, or `/checkout`.
- LCP is above the 2,500 ms target with no mitigation plan documented.
- First Load JS bundle size (not just transferred bytes) is not reported.

---

## Area 6: Discovery/Metadata — PARTIAL

### What is implemented correctly

- **`metadataBase`** is set in `src/app/layout.js`: `new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.addiseats.com")`. ✓
- **Root layout metadata**: title template `"%s | Addis Eats"`, default description, keywords, OG title + description + siteName + type, Twitter card. ✓
- **`/menu` page**: distinct `title: "Menu"` and `description: "Browse Addis Eats favorites including doro wat, kitfo, burgers, pizza, and traditional drinks."` ✓
- **`/` page**: distinct `title: "Home"` and `description` specific to the home page. ✓
- **`/menu/[slug]` page**: `generateMetadata` produces per-dish title, description, canonical URL, OG type `"article"`, OG title + description + image (1200×630 dimensions declared), Twitter card. ✓
- **OG images on dish pages**: `imageUrl = new URL(dish.image, SITE_URL).toString()` produces an absolute URL using `metadataBase`-equivalent logic. The declared width is 1200, height is 630. ✓
- **JSON-LD on dish pages**: `@type: "MenuItem"`, `name`, `description`, `image` (absolute URL), `category`, `offers` with `priceCurrency: "ETB"` and actual `price`. All fields match what the page renders. ✓
- **Sitemap** (`src/app/sitemap.js`): includes `/`, `/menu`, and all 13 dish URLs. Excludes private routes. ✓
- **Robots.txt** (`src/app/robots.js`): disallows `/api`, `/signin`, `/orders`, `/checkout`, `/cart`, `/kitchen`. Allows `/` and `/menu`. Points to sitemap. ✓

### Issues found

1. **Home page has no OG image.** `src/app/page.js` exports `metadata` with title and description but no `openGraph.images`. The root layout's OG object also has no `images` field. Brief requires OG to include at least one 1200×630 image. **FAIL for home page OG image.**

2. **Root layout OG has no image.** The root `openGraph` block in `layout.js` sets title, description, siteName, type, locale — but no `images`. This means any route without its own OG image (home, menu list, checkout, orders) inherits no OG image.

3. **No `og:url` on the home page.** The dish pages set `openGraph.url` correctly, but the home page metadata block does not include `url`.

4. **No metadata on protected pages.** `/checkout`, `/orders`, `/orders/[id]`, and `/kitchen` have no `export const metadata`. These are private pages and should not be indexed, but they also lack even a basic `title` for browser tab display.

5. **`/cart` page lacks metadata.** No title or description defined.

6. **Sitemap priority note:** The sitemap uses `new Date()` for `lastModified` on every request, which means the sitemap always reports today as the modification date. This is technically incorrect (static pages don't change on every request) but is a minor SEO concern, not a blocking issue.

---

## Documents — PARTIAL

### AUTH.md — PASS

AUTH.md covers:
- What was added (session cookie, signing, proxy, page checks, action checks)
- Behavior (redirects, ownership, role checks, `next` validation)
- The three attacks (implicitly): `next` sanitization is documented; session checks on sign-out are documented
- Demo credentials

**Gap:** AUTH.md does not explicitly call out the three attacks by name as the brief requires. The document describes the defenses but does not structure them as "Attack 1 / Attack 2 / Attack 3 with the specific line that stops each one." The brief says AUTH.md must document the three attacks and what stopped each one. This is partially met.

### DATA.md — PASS

DATA.md covers:
- Route/data map table with all relevant areas
- Ownership rules
- Seed strategy for client-only fetches
- Demo storage limitation
- Client/server boundary decisions

**Well structured and accurate** against the actual code.

### PERF.md — FAIL

PERF.md has before AND after columns for `/menu` (both filled with real numbers). However:
- Only `/menu` is measured; all other routes are listed as "Not yet measured."
- LCP is above the brief's 2,500 ms target with no documented mitigation.
- The document acknowledges the regression but does not document a fix.
- "First Load JS" bundle size is not reported separately from page weight.

### BOUNDARY.md — PASS

Accurately lists all 9 `"use client"` files with rationale. Notes the DishList composition pattern (imported by FilterShell, therefore in the client graph). Matches actual code.

### README.md — PARTIAL

README.md exists with full feature documentation, route map, build output, endpoints, project structure, and tech stack.

**Gap:** No deployed URL. README says "Not deployed. Run locally." The brief requires a deployed URL in README.md. **FAIL on deployed URL requirement.**

---

## The Three Attacks

### Attack 1: `cancelOrder` called signed-out

**Expected:** Refused by session check, not a crash.

**Code path:** `cancelOrder(orderId)` in `src/app/actions.js`, lines 1–9:
```js
const session = await getSession();
if (!session) {
  return { error: "You must be signed in to cancel an order." };
}
```

**Result:** ✓ DEFENDED. Returns `{ error: "You must be signed in to cancel an order." }`. Does not crash. The line that stops it is the `if (!session)` guard at the top of `cancelOrder`.

---

### Attack 2: `cancelOrder` called with another account's order ID

**Expected:** Refused on OWNERSHIP, not session.

**Code path:** `cancelOrder(orderId)` in `src/app/actions.js`:
```js
const order = orders.find((o) => o.id === orderId);
if (!order) {
  return { error: "Order not found." };
}
if (session.role !== "staff" && order.customerName !== session.name) {
  return { error: "You don't own this order." };
}
```

**Result:** ✓ DEFENDED. If the caller is signed in but passes another user's order ID, the session check passes (they are authenticated), but the ownership check `order.customerName !== session.name` catches it. Returns `{ error: "You don't own this order." }`. The line that stops it is the ownership check, not the session check — exactly as required.

---

### Attack 3: `/signin?next=https://example.com` (open redirect)

**Expected:** Should land on `/`, not `https://example.com`.

**Code path 1 — Proxy** (`src/proxy.js`): `sanitizeNextPath` is called on the `next` parameter. It rejects any value that does not start with `/`, starts with `//`, contains `\`, or contains control characters. `https://example.com` starts with `h`, not `/`, so it maps to `"/"`.

**Code path 2 — Action** (`src/app/actions.js`): `signIn` calls `sanitizeNextPath(formData.get("next")?.toString())`. Same logic applies.

**Code path 3 — Sign-in page** (`src/app/signin/page.js`): The raw `next` parameter from `searchParams` is passed unsanitized to the `SignInForm` as `nextPath`, but this only affects the hidden field value displayed to the form. The actual redirect is performed by the `signIn` server action which sanitizes the value.

**Result:** ✓ DEFENDED. An attacker who visits `/signin?next=https://example.com` will see the form with `nextPath="https://example.com"` (visible in DOM), but when the form is submitted, the action calls `sanitizeNextPath("https://example.com")` → returns `"/"` → user is redirected to `/`. The defending line is `sanitizeNextPath` in `src/lib/session.js` (used by the action) and `src/proxy.js` (used by middleware).

**Minor concern:** The `next` value is passed unsanitized to `SignInForm` as a prop, meaning an attacker could craft a URL where the hidden field shows an external URL. While the action prevents the actual redirect, it could still be used in a phishing scenario to display a misleading value to sophisticated users. Low severity for a classroom project, but worth noting.

---

## Issues Found (Prioritized)

### Critical

None. The core security model is sound.

### High

1. **LCP target not met (3,479 ms vs. < 2,500 ms target).** The photo-heavy menu page worsens the metric the optimization was supposed to improve. No mitigation is documented. Fix: serve images with better compression, add `priority` prop to the LCP image, or use responsive `sizes` more aggressively.

2. **No deployed URL in README.md.** Brief explicitly requires this as a deliverable. The README says "Not deployed."

3. **Home page has no OG image.** Brief requires OG to include a 1200×630 image. The root layout OG block and the home page metadata both lack an `images` field.

### Medium

4. **PERF.md only measures `/menu`.** Nine other routes are listed as "Not yet measured." Brief says performance must be measured and documented.

5. **AUTH.md does not explicitly list the three attacks by name** with the specific line that stops each one, as the brief requires.

6. **Item prices not re-validated against canonical data.** Submitted order items are validated for shape only; manipulated prices are accepted. STRATEGY.md notes this openly. Fix: look up each item by ID in `getDishes()` inside `placeOrder` and `POST /api/orders`, and replace submitted price with the canonical value.

### Low

7. **`sanitizeNextPath` is duplicated** in `session.js` and `proxy.js`. Should be extracted to a shared utility.

8. **`/cart`, `/checkout`, `/orders`, `/kitchen` have no metadata.** Private pages don't need SEO metadata, but a basic `title` for the browser tab would be good practice.

9. **Sitemap `lastModified` always uses `new Date()`**, reporting today's date for static pages. Minor SEO inaccuracy.

10. **Unsanitized `next` prop passed to SignInForm.** The value is sanitized server-side before the redirect, but the prop itself is unguarded, creating a minor DOM-based phishing surface.

11. **No `og:url` on the home page.** OG spec recommends the canonical URL in every OG block.

---

## Overall Verdict

| Area | Score | Key finding |
|---|---|---|
| 1. Accounts | **PASS** | HMAC-signed cookie, constant-time verify, HttpOnly, correct sign-in/out |
| 2. Protection | **PASS** | All three layers present on all protected routes; middleware does full token verification |
| 3. Ownership | **PASS** | Session scopes all reads/writes; cancelOrder enforces ownership, not just auth |
| 4. Live Data | **PASS** | Poll with server fallbackData ✓; debounced search at network level ✓ |
| 5. Performance | **FAIL** | LCP 3,479 ms (target < 2,500 ms); only /menu measured; JS bundle size not reported |
| 6. Discovery/Metadata | **PARTIAL** | JSON-LD ✓, sitemap ✓, robots ✓, per-dish OG ✓; home page missing OG image; no deployed URL |
| Documents | **PARTIAL** | AUTH.md/DATA.md/BOUNDARY.md accurate; PERF.md incomplete; README missing deployed URL |
| Three Attacks | **PASS** | All three attacks defended; correct layer stops each one |

**Overall: PARTIAL PASS.** Security architecture is solid and correct. The two failing areas are documentation gaps (performance measurements incomplete, no deployed URL) and a missing OG image on the home page. Fixing these requires no architectural changes — they are content/measurement gaps, not design flaws.
