# Addis Eats — Day 45 / Week 9 Final Build

Accounts, sessions, three-layer route protection, scoped queries, live order status, debounced menu search, optimised images and fonts, and full metadata/SEO.

## Live preview

> **Deploy to Vercel and paste the URL here before presenting.**
> Social previews, absolute OG image URLs, and `AUTH_SECRET` only work on a real deployment.
> Run `npm run build && npm run start` locally until then.

```
Deployed URL: https://<your-vercel-project>.vercel.app
```

## Run locally

```bash
git clone <repo-url>
cd addis_eats
npm install
node -e "require('node:fs').writeFileSync('.env.local', 'AUTH_SECRET=' + require('node:crypto').randomBytes(32).toString('base64url') + '\n', { flag: 'wx' })"
npm run build
npm run start
```

The generated `.env.local` is ignored by Git. Keep it private and use a separate random secret for
each deployed environment. Restart the server after changing it.

Open **http://localhost:3000**.

For development (hot reload, no performance data):

```bash
npm run dev
```

## Demo accounts

| Name | Password | Role |
| --- | --- | --- |
| Abebe Kebede | addis123 | customer |
| Kitchen Staff | kitchen123 | staff |

Sign in at `/signin`. The session lives in an `HttpOnly`, `SameSite=lax`, HMAC-signed cookie.

---

## The six requirements (Day 45 brief)

### 1. Accounts ✅
- Sign-in and sign-out via Server Actions (`src/app/actions.js`)
- Session in an `HttpOnly`, `SameSite=lax`, `Secure` (prod) cookie
- HMAC-SHA-256 signed token, 7-day expiry, constant-time verification
- `AUTH_SECRET` env var required in production; startup throws if missing

### 2. Protection ✅
Three independent layers on every private route:

| Route | Middleware | Page | Action/API |
| --- | --- | --- | --- |
| `/checkout` | Redirects unsigned | `requireSession` | `placeOrder` re-checks session |
| `/orders` | Redirects unsigned | `requireSession` + scoped filter | API re-checks session + ownership |
| `/orders/[id]` | Redirects unsigned | `requireSession` + `notFound()` if wrong owner | API re-checks session + ownership |
| `/kitchen` | Redirects non-staff | `requireSession` + role check | — (read-only) |

Full detail: see **AUTH.md**.

### 3. Ownership ✅
- `/orders` filters by `session.name` — never by a URL param
- `/orders/[id]` returns 404 if the order belongs to another user
- `placeOrder` overwrites `customerName` with `session.name` (form field ignored)
- `cancelOrder` re-checks `order.customerName === session.name` before mutating
- URL attack: changing the id in `/orders/abc` returns 404, not someone else's data

### 4. Live data ✅
- **Polled status:** `OrderStatusClient.jsx` — SWR polls `/api/orders/[id]` every 5 s; stops when `delivered` or `cancelled`; seeded with server-fetched `order` as `fallbackData` (no spinner on load)
- **Debounced search:** `FilterShell.jsx` — `useDebouncedValue` at 350 ms; SWR key is `null` until debounced term exists (one request per pause, not per keystroke); seeded with server `dishes` as `fallbackData`

### 5. Performance ✅ (documented)
- `next/image` for all dish photos: WebP, quality 60, responsive `sizes`, `priority` on LCP image
- `next/font/google` for Geist: self-hosted, no runtime font request, fallback minimises CLS
- `optimizePackageImports: ["swr", "zod"]` in `next.config.mjs`
- Lighthouse scores on `localhost:3000` (production build, mobile throttling): **85 / 85 / 80**
- LCP: 1.8 s ✅ | CLS: 0 ✅ | Largest image: 132.7 kB ✅
- TBT causes scores below 90 — see **PERF.md** for full before/after and honest explanation

### 6. Discovery ✅
- `metadataBase` set in root layout; title template `"%s | Addis Eats"`
- Per-route distinct titles and descriptions on `/`, `/menu`, `/menu/[slug]`
- Per-dish `generateMetadata` with OG image (1200×630), Twitter card, canonical URL
- JSON-LD `MenuItem` schema on every dish page (matches what the page renders)
- `/sitemap.xml` — real dish URLs generated from data; private routes excluded
- `/robots.txt` — disallows `/api`, `/signin`, `/orders`, `/checkout`, `/cart`, `/kitchen`
- Root layout `openGraph.images` set (for home page social preview)

---

## Deliverables

| File | Contents |
| --- | --- |
| `AUTH.md` | Every route/action, its three layers, what each proves, and the three attacks with exact lines |
| `DATA.md` | Every query: server or client, key, refresh rule, one line of reasoning |
| `PERF.md` | Budget table with before and after columns filled, and what caused each change |

---

## The three attacks (run from browser console)

```js
// 1. Signed out — should be refused, not crash
await cancelOrder("ord_812");
// → { error: "You must be signed in to cancel an order." }
// Stopped by: src/app/actions.js line 42

// 2. Signed in as someone else — should refuse on OWNERSHIP, not session
await cancelOrder("<another-accounts-order-id>");
// → { error: "You don't own this order." }
// Stopped by: src/app/actions.js line 51

// 3. Open redirect — should land on /, not example.com
// Visit: /signin?next=https://example.com
// → redirects to /
// Stopped by: sanitizeNextPath() in src/lib/session.js
```

---

## Route map

| Route | Who | Rendering | Protection |
| --- | --- | --- | --- |
| `/` | Everyone | Dynamic (root layout reads session) | None |
| `/menu` | Everyone | Dynamic | None |
| `/menu/[slug]` | Everyone | Dynamic | None |
| `/cart` | Everyone | Client | None |
| `/signin` | Unsigned | Dynamic | Redirects signed-in users |
| `/checkout` | Signed-in | Dynamic | Middleware + page |
| `/checkout/success` | Signed-in | Dynamic | Redirects on missing id |
| `/orders` | Owner | Dynamic | Middleware + page + scoped query |
| `/orders/[id]` | Owner | Dynamic | Middleware + page + ownership check |
| `/kitchen` | Staff | Dynamic | Middleware (role) + page (role) |
| `/api/dishes` | Everyone | Route handler | None |
| `/api/orders` | Signed-in | Route handler | Session check in handler |
| `/api/orders/[id]` | Owner | Route handler | Session + ownership in handler |
| `/sitemap.xml` | Everyone | Static | None |
| `/robots.txt` | Everyone | Static | None |

---

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── dishes/route.js             public dish list + search
│   │   ├── dishes/[id]/route.js        single dish
│   │   ├── orders/route.js             POST new order (auth required)
│   │   └── orders/[id]/route.js        GET order status (auth + ownership)
│   ├── cart/page.js                    client-only cart view
│   ├── checkout/
│   │   ├── page.js                     protected shell
│   │   ├── CheckoutForm.jsx            client form
│   │   └── success/page.js             order confirmation
│   ├── kitchen/page.js                 staff-only order list
│   ├── menu/
│   │   ├── [slug]/page.jsx             dish detail + JSON-LD
│   │   ├── FilterShell.jsx             client: search + filter + SWR
│   │   ├── DishCard.jsx                image + priority on first card
│   │   └── page.js                     server: fetch dishes
│   ├── orders/
│   │   ├── page.js                     scoped order list
│   │   └── [id]/
│   │       ├── page.js                 ownership check + seed
│   │       └── OrderStatusClient.jsx   SWR poll every 5 s
│   ├── signin/page.js                  sign-in form
│   ├── actions.js                      all Server Actions
│   ├── layout.js                       root layout + session nav
│   ├── robots.js                       /robots.txt
│   └── sitemap.js                      /sitemap.xml
└── lib/
    ├── session.js                      getSession, setSession, requireSession
    ├── session-token.js                HMAC sign/verify
    ├── dishes.js                       getDishes()
    ├── orders.js                       in-memory order store
    ├── providers.jsx                   cart context
    ├── schema.js                       Zod order schema
    └── fetcher.js                      SWR fetcher
```

---

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `AUTH_SECRET` | Production | Long random string for HMAC signing. Generate with `openssl rand -base64 32`. |
| `NEXT_PUBLIC_SITE_URL` | Deployment | Absolute base URL (e.g. `https://addis-eats.vercel.app`). Used for OG images and sitemap. |

A dev fallback secret is used locally if `AUTH_SECRET` is absent. Production startup throws without it.

---

## Known limitations

- **In-memory orders.** `src/lib/orders.js` stores orders in a process-local array. Orders reset on server restart and are not shared across serverless instances. A production app would use a database.
- **Hardcoded credentials.** Two demo accounts are fixed in `DEMO_ACCOUNTS`. There is no registration or real password hashing.
- **Stateless sessions.** Sign-out clears the browser cookie but does not revoke the token. A copied token remains valid for up to 7 days.
- **No deployed URL yet.** Deploy to Vercel and update this file before presenting.

---

## Tech stack

- **Next.js 16** (App Router, Turbopack)
- **React 19**
- **SWR** — client-side polling and debounced search
- **Zod** — server-side and shared form validation
- **Tailwind CSS v4**
- **next/font** — Geist, self-hosted
- **next/image** — WebP conversion, responsive sizing, lazy loading

---

## Scripts

```bash
npm run dev     # development server
npm run build   # production build (prints route table + First Load JS sizes)
npm run start   # serve production build
npm run lint    # ESLint
```
