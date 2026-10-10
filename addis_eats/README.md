# Addis Eats — Day 45 / Week 9 Final Build

Accounts, sessions, three-layer route protection, scoped queries, live order status, debounced menu search,
optimised images and fonts, and full metadata/SEO with working social preview images.

## Live preview

```
https://addiseatsnext.vercel.app
```

Social previews, absolute OG image URLs and `AUTH_SECRET` behave differently in production, so every claim
below was verified against this deployment (verification log in **AUTH.md**).

### Share test (the preview image)

Open any of these and confirm the card renders with an image, title, description and price:

| URL | Preview |
| --- | --- |
| `https://addiseatsnext.vercel.app` | Brand card, 1200 × 630 |
| `https://addiseatsnext.vercel.app/menu/special-doro-wat` | Dish card with name, description and **450 Birr** |

Tools that check it the way platforms actually scrape:

- **WhatsApp / Telegram / iMessage:** paste the link in a chat with yourself (quickest).
- **Facebook:** <https://developers.facebook.com/tools/debug/> — *Scrape Again* to bust the cache.
- **Twitter/X:** <https://cards-dev.twitter.com/validator>
- **Slack / Discord:** paste and wait a couple of seconds.

`og:image` is an absolute URL on `addiseatsnext.vercel.app` (see `src/lib/site.js`), the file returns
`200 image/png` at exactly 1200 × 630, and `metadataBase` is set in the root layout.

---

## Run locally

```bash
git clone <repo-url>
cd addis_eats
npm install
node -e "require('node:fs').writeFileSync('.env.local', 'AUTH_SECRET=' + require('node:crypto').randomBytes(32).toString('base64url') + '\nNEXT_PUBLIC_SITE_URL=https://addiseatsnext.vercel.app\n', { flag: 'wx' })"
npm run build
npm run start
```

`.env.local` is ignored by Git. Keep it private and use a separate random secret for each deployed
environment. Restart the server after changing it. Open **http://localhost:3000**.

Development (hot reload, no performance data): `npm run dev`.

---

## Demo accounts

| Name | Password | Role |
| --- | --- | --- |
| Abebe Kebede | addis123 | customer |
| Kitchen Staff | kitchen123 | staff |

Sign in at `/signin`. The session lives in an `HttpOnly`, `SameSite=lax`, HMAC-signed cookie.

**Live demo in one minute:** sign in as *Kitchen Staff* → `/kitchen` → press *Start preparing*. Sign in as
*Abebe Kebede* on another browser/incognito → open the order → the status flips within 5 s without a
reload. That is the polled, seeded live-data requirement in one step.

---

## The six requirements (Day 45 brief)

### 1. Accounts ✅
- Sign-in and sign-out via Server Actions (`src/app/actions.js`)
- Session in an `HttpOnly`, `SameSite=lax`, `Secure` (prod) cookie
- HMAC-SHA-256 signed token, 7-day expiry, constant-time verification
- `AUTH_SECRET` required in production; startup throws if missing

### 2. Protection ✅
Three independent layers on every private route:

| Route | Proxy (middleware) | Page | Action / API |
| --- | --- | --- | --- |
| `/checkout` | Redirects unsigned | `requireSession` | `placeOrder` re-checks session |
| `/checkout/success` | Redirects unsigned | `requireSession` | `?id=` ownership → 404 |
| `/orders` | Redirects unsigned | `requireSession` + scoped filter | API re-checks session + ownership |
| `/orders/[id]` | Redirects unsigned | `requireSession` + `notFound()` on wrong owner | API re-checks on every poll |
| `/kitchen` | Redirects non-staff | `requireSession` + role check | `updateOrderStatus` re-checks role inside the action |

Full detail, with the exact line that refuses each call: **AUTH.md**.

### 3. Ownership ✅
- `/orders` filters by `session.name` — never by a URL param
- `/orders/[id]` and `/checkout/success` return 404 for another account's id (verified: no data in the body)
- `placeOrder` overwrites `customerName` with `session.name` (form field ignored)
- `cancelOrder` re-checks `order.customerName === session.name` before mutating
- **Price integrity:** item name and price are re-read from the dish catalogue on the server — a request
  that claims `price: 1` is stored at **450** (verified), and an unknown dish id is refused with `422`

### 4. Live data ✅
- **Polled status:** `OrderStatusClient.jsx` — SWR polls `/api/orders/[id]` every 5 s, stops on
  `delivered`/`cancelled`, seeded with the server-fetched order as `fallbackData` (no spinner on arrival)
- **Debounced search:** `FilterShell.jsx` — `useDebouncedValue` at 350 ms; the SWR key stays `null` until a
  debounced term exists (one request per pause, not per keystroke), seeded with server `dishes`
- **Something to poll:** `/kitchen` now has status controls, so the status actually changes during the demo

### 5. Performance ✅ (documented, including the one miss)
- `next/image` with pre-cropped WebP assets, `priority` + `fetchPriority="high"` on the LCP image only
- `next/font/google` for Geist: self-hosted, no runtime font request, CLS stays 0
- `prefetch={false}` on every `<Link>`; social images are generated on request and never load with the page
- **Lighthouse on the deployed build** (Lighthouse CLI, mobile, simulated throttling, 2026-10-10):

  | Route | Performance | LCP | CLS | SEO |
  | --- | ---: | ---: | ---: | ---: |
  | `/` | **95** | 1.60 s | 0 | 100 |
  | `/menu` | **96** | 2.20 s | 0 | 100 |
  | `/menu/special-doro-wat` | **97** | 2.28 s | 0 | 100 |

- Targets: performance ≥ 90 ✅ · LCP < 2.5 s ✅ · CLS < 0.1 ✅ · largest image < 150 kB ✅ (132.7 kB)
- First Load JS `/menu` = **156.2 kB** transferred (target < 120 kB) ❌ — React 19 + Next 16 baseline,
  explained in **PERF.md** together with the before/after budget table (baseline was 81, now 96)

### 6. Discovery ✅
- `metadataBase` set from `src/lib/site.js` → always `https://addiseatsnext.vercel.app`
- Distinct title **and description on every route**: `/`, `/menu`, `/menu/[slug]`, `/cart`, `/signin`,
  `/checkout`, `/checkout/success`, `/orders`, `/orders/[id]`, `/kitchen`
- Per-dish `generateMetadata` with canonical URL, Twitter card and a real 1200 × 630 OG image
- Generated preview cards: `/opengraph-image` (site-wide) and `/menu/[slug]/opengraph-image` (per dish,
  includes the price) — both verified `200 image/png`
- JSON-LD `MenuItem` schema on every dish page, matching what the page renders
- `/sitemap.xml` — `/`, `/menu` and all real dish URLs; **no private routes**
- `/robots.txt` — allows `/` and `/menu`; disallows `/api`, `/signin`, `/orders`, `/checkout`, `/cart`,
  `/kitchen`
- Private routes also emit `<meta name="robots" content="noindex, nofollow">`

---

## Deliverables

| File | Contents |
| --- | --- |
| `AUTH.md` | Every route/action, its layers, what each proves, the three attacks with the exact refusing line, and a verification log |
| `DATA.md` | Every query: server or client, key, refresh rule, one line of reasoning |
| `PERF.md` | Budget table with before **and** after columns, plus what caused each change |
| `README.md` | This file — deployed URL and how to run from a fresh clone |

---

## The three attacks (run from the browser console)

Server Actions cannot be called by name from the console, so `src/app/ActionConsole.jsx` binds them to
`window` for the demo. They re-check everything server-side regardless — the binding only makes the
brief's verification script runnable.

```js
// 1. Signed OUT — must be refused, not crash
await cancelOrder("<any order id>");
// → { error: "You must be signed in to cancel an order." }
// Stopped by: src/app/actions.js:126-127

// 2. Signed in as someone else — must refuse on OWNERSHIP, not on session
await cancelOrder("<another account's order id>");
// → { error: "You don't own this order." }
// Stopped by: src/app/actions.js:134-135

// Bonus: a customer calling a staff action
await updateOrderStatus("<any order id>", "delivered");
// → { error: "Only kitchen staff can update an order status." }
// Stopped by: src/app/actions.js:162-163

// 3. Open redirect — visit /signin?next=https://example.com
//    signed out → lands on / after signing in
//    already signed in → lands on /orders
// Stopped by: sanitizeNextPath() in src/lib/session.js:10-25
```

---

## Route map

| Route | Who | Rendering | Protection |
| --- | --- | --- | --- |
| `/` | Everyone | Dynamic (root layout reads session) | None — public, indexable |
| `/menu` | Everyone | Dynamic | None — public, indexable |
| `/menu/[slug]` | Everyone | Dynamic | None — public, indexable |
| `/cart` | Everyone | Client data | None (`noindex`) |
| `/signin` | Unsigned | Dynamic | Redirects signed-in users (`noindex`) |
| `/checkout` | Signed-in | Dynamic (`force-dynamic`) | Proxy + page |
| `/checkout/success` | Signed-in, own order | Dynamic | Proxy + page + ownership on `?id=` |
| `/orders` | Owner (staff: all) | Dynamic | Proxy + page + scoped query |
| `/orders/[id]` | Owner (staff: any) | Dynamic | Proxy + page + ownership + API re-check |
| `/kitchen` | Staff | Dynamic | Proxy (role) + page (role) + role check inside actions |
| `/opengraph-image` | Everyone | Static image (1200 × 630) | None |
| `/menu/[slug]/opengraph-image` | Everyone | Generated image (1200 × 630, price) | None |
| `/api/dishes` | Everyone | Route handler | None (public menu search) |
| `/api/orders` (POST) | Signed-in | Route handler | Session + canonical price + ownership overwrite |
| `/api/orders/[id]` (GET) | Owner | Route handler | Session + ownership in handler |
| `/sitemap.xml`, `/robots.txt` | Everyone | Static | None |

---

## Project structure

```
src/
├── app/
│   ├── ActionConsole.jsx               binds server actions to window for the console attacks
│   ├── api/
│   │   ├── dishes/route.js             public dish list + debounced search
│   │   ├── dishes/[id]/route.js        single dish
│   │   ├── orders/route.js             POST new order (session + canonical price)
│   │   └── orders/[id]/route.js        GET order status (session + ownership)
│   ├── cart/page.js                    client-only cart view
│   ├── checkout/
│   │   ├── page.js                     protected shell
│   │   ├── CheckoutForm.jsx            client form
│   │   └── success/page.js             confirmation + ownership check on ?id=
│   ├── kitchen/
│   │   ├── page.js                     staff-only order list
│   │   └── OrderStatusControls.jsx     staff: preparing / delivering / delivered / cancel
│   ├── menu/
│   │   ├── [slug]/page.jsx             dish detail + JSON-LD + generateMetadata
│   │   ├── [slug]/opengraph-image.js   1200×630 dish card with price
│   │   ├── FilterShell.jsx             client: debounced search + filter + SWR
│   │   ├── DishCard.jsx                image + priority on first card
│   │   └── page.js                     server: fetch dishes
│   ├── opengraph-image.js              1200×630 site-wide preview card
│   ├── orders/
│   │   ├── page.js                     scoped order list
│   │   └── [id]/
│   │       ├── page.js                 ownership check + seed
│   │       ├── OrderStatusClient.jsx   SWR poll every 5 s
│   │       └── CancelOrderButton.jsx   owner cancel control
│   ├── signin/page.js                  sign-in form
│   ├── actions.js                      all Server Actions
│   ├── layout.js                       root layout + session nav + metadataBase
│   ├── robots.js                       /robots.txt
│   └── sitemap.js                      /sitemap.xml
└── lib/
    ├── site.js                         SITE_URL + absoluteUrl() — one source of truth
    ├── session.js                      getSession, setSession, requireSession, sanitizeNextPath
    ├── session-token.js                HMAC sign/verify
    ├── dishes.js                       getDishes() + card/detail image helpers
    ├── orders.js                       globalThis-backed in-memory order store
    ├── providers.jsx                   cart context
    ├── schema.js                       Zod order schema
    └── fetcher.js                      SWR fetcher
```

---

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `AUTH_SECRET` | Production | Long random string for HMAC signing. Generate with `openssl rand -base64 32`. |
| `NEXT_PUBLIC_SITE_URL` | Deployment | Absolute base URL — `https://addiseatsnext.vercel.app`. Used for `metadataBase`, `og:image`, canonical links, sitemap and robots. |

A dev fallback secret is used locally if `AUTH_SECRET` is absent; production startup throws without it.
`NEXT_PUBLIC_SITE_URL` falls back to the deployed origin in `src/lib/site.js`, so previews are correct even
if the variable is missing — but set it in Vercel anyway when you create a new preview branch.

---

## Known limitations

- **In-memory orders.** `src/lib/orders.js` stores orders in an array on `globalThis` (one per process —
  this is deliberate: pages, server actions and route handlers are bundled separately and would otherwise
  get different arrays). Orders reset on restart and are not shared between serverless instances. Use a
  database before relying on this in production.
- **Hardcoded credentials.** Two demo accounts in `DEMO_ACCOUNTS`; no registration, no password hashing.
- **Stateless sessions.** Sign-out clears the browser cookie but does not revoke the token; a copied token
  works until its 7-day expiry.
- **Everything is dynamic.** The root layout reads the session cookie, so `/` and `/menu` are server-rendered
  per request and `revalidate = 3600` has no effect. Documented in DATA.md as a deliberate trade-off.
- **Soft 404 status.** `notFound()` inside these pages renders the not-found UI while the response still
  streams as `200` (the `loading.js` boundary flushes first). The data is never leaked — only the status
  code is optimistic. Unmatched top-level routes still return a real `404`.
- **`window.cancelOrder` / `window.updateOrderStatus`.** Demo affordance for the console attacks — see
  AUTH.md. Delete `src/app/ActionConsole.jsx` for a real deployment; the on-page buttons keep working.

---

## Tech stack

- **Next.js 16** (App Router, Turbopack) · **React 19**
- **SWR** — client-side polling and debounced search
- **Zod** — server-side and shared form validation
- **Tailwind CSS v4** · **next/font** (Geist) · **next/image** (pre-cropped WebP)
- **next/og** — generated 1200 × 630 social preview cards

---

## Scripts

```bash
npm run dev     # development server
npm run build   # production build (route table + bundle report)
npm run start   # serve production build
npm run lint    # ESLint
```
