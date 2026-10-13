# Addis Eats — Data & Fetching

**Live app:** https://addiseatsnext.vercel.app · Last verified 2026-10-10 against a production build.

This project follows the week-9 rule: **server whenever the person is not triggering the query, client
only for interaction-driven reads that must refresh from input.**

## The rule, applied

| Data | Where it runs | Key / entry point | Refresh rule | Why (one line) |
| --- | --- | --- | --- | --- |
| Menu and dishes | Server | `getDishes()` in `src/lib/dishes.js` | `revalidate = 3600` is exported, but the root layout reads the session cookie, so the route renders dynamically | Public content, indexable, cacheable — and the trade-off is documented rather than hidden |
| Landing page sections | Server | `getDishes()` in `src/app/page.js` (course groups, signature picks, greeting) | Same as the menu: dynamic because of the layout's session cookie | The home page shows the live catalogue, so a dish added in the kitchen appears on the next request |
| Open / closed pill | Client | `OpenStatus.jsx` → `Intl` with `Africa/Addis_Ababa` | Recomputed every 60 s, filled in after mount | "Open now" depends on the visitor's current time, not on server data; mount-gating avoids a hydration mismatch |
| Order history | Server | `getOrders()` + scoped filter in `src/app/orders/page.js:16-18` | Rendered per request (dynamic) | Personal data must be scoped to the signed-in user |
| Order detail / ownership | Server | `getOrderById(id)` in `src/app/orders/[id]/page.js:22` | Rendered per request | The id is looked up first, then authorised; a mismatch is a 404 |
| Live order status | Server first, then client | `OrderStatusClient.jsx` → `GET /api/orders/[id]` | SWR `refreshInterval` 5 s, stops on `delivered`/`cancelled` | The view is user-specific, but the status must refresh without a full reload |
| Menu search | Client | `useSWR` key `/api/dishes?search=…&page=…` in `FilterShell.jsx:35-37` | Key is `null` until the debounced term exists → one request per 350 ms pause | Typing is user-driven; per-keystroke requests are wasteful |
| Kitchen queue | Server | `getOrders()` in `src/app/kitchen/page.js` | Rendered per request | Staff-only, role-checked in the proxy and the page |
| Cart | Client store | `src/lib/providers.jsx` | Local component state | Cart contents stay in-browser and never need server persistence |
| Checkout / order creation | Server action | `placeOrder` in `src/app/actions.js` | One write on submit | The action verifies the session, overwrites `customerName`, and re-prices items from the catalogue |
| Kitchen status change | Server action | `updateOrderStatus` in `src/app/actions.js:156` | One write per click, then `revalidatePath` | Staff-only role check lives inside the action, not in the UI |

## Keys and why they are shaped that way

```js
// Search: null key = SWR does nothing until the user actually searched
const searchKey = searchValue ? `/api/dishes?search=${encodeURIComponent(searchValue)}&page=${safePage}` : null;

// Status: one stable key per order, so the poll and the seed share a cache entry
useSWR(`/api/orders/${order.id}`, fetcher, { fallbackData: order, refreshInterval: … });
```

## Seed strategy (no spinner for data we already had)

| Client query | Server seed passed in |
| --- | --- |
| Menu search (`FilterShell.jsx:40-44`) | `fallbackData: { dishes: initialDishes, totalPages, totalItems }` from the server-rendered page |
| Order status (`OrderStatusClient.jsx:15-16`) | `fallbackData: order` fetched and ownership-checked on the server |

Verified: loading `/orders/<id>` paints the order immediately — the "Refreshing order status…" line only
appears during a poll, never as an arrival state.

## Ownership rules

- `/orders` shows only the current session's records (staff see all, by decision — see AUTH.md).
- `/orders/[id]` and `/checkout/success` return the not-found page for an id that is not yours.
- `placeOrder` and `POST /api/orders` overwrite `customerName` with the session value.
- Item `name` and `price` are **never** taken from the client: `normaliseOrderItems()` re-reads them from
  the dish catalogue, so a crafted body with `price: 1` is stored at the real price (verified: 450).
- Every mutating action re-checks session (and role, and ownership) before it writes.

## Storage: one process, one array — shared on purpose

`src/lib/orders.js` keeps orders in an array hung off `globalThis.__ADDIS_EATS_ORDERS__`.

**Why `globalThis`:** Next.js bundles server code per entrypoint — pages/Server Components/Server Actions
and Route Handlers end up in different chunks. With a plain `export const orders = []` the array was
evaluated **twice**, so orders placed in checkout were invisible to `GET /api/orders/[id]` (the live poll)
and orders created through the API were invisible to `/orders` and `/kitchen`. This was found during the
2026-10-10 audit by grepping the build output:

```
.next/server/chunks/ssr/[root-of-the-server]__1lpywbr._.js   ← pages/actions copy
.next/server/chunks/_0he5n4h._.js                             ← route-handler copy
```

Hanging the array off `globalThis` gives every bundle the same store, the way a database connection is
shared. After the fix, an order created through the API appears on `/orders` and in `/kitchen` in the same
process (verified in the log in AUTH.md).

**Limitation:** the store is still per-process. Orders reset on restart and are not shared between
serverless instances — persist them in a database before relying on this outside a demo.

## Data decisions summary

- Public menu data stays server-side; the root layout's session lookup keeps the route dynamic — a
  documented trade-off, not an accident.
- Personal order data stays scoped to the session.
- Search and live status are the only client-driven reads, and both are seeded from the server.
- Client state is used only for cart behaviour and UI interaction, never for private data.
- Prices are computed on the server; the client only supplies ids and quantities.
