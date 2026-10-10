# Addis Eats — Authentication & Authorisation

**Live app:** https://addiseatsnext.vercel.app
**Last verified:** 2026-10-10 — every line reference below was re-checked against the running production build (see [Verification log](#verification-log)).

## Session

- **Cookie name:** `session`
- **Signing:** HMAC-SHA-256 via Web Crypto API (`src/lib/session-token.js`)
- **Verification:** constant-time byte comparison (prevents timing attacks) — `src/lib/session-token.js:63-67`
- **Flags:** `HttpOnly`, `SameSite=lax`, `Secure` (production only), `maxAge` 7 days — `src/lib/session.js:34-42`
- **Storage:** stateless signed token — no database lookup required
- **Revocation:** sign-out deletes the browser cookie; the token remains valid until expiry (acknowledged limitation for a demo)
- **Secret:** `AUTH_SECRET` env var; production startup throws if missing (`src/lib/session-token.js:8-10`)

## Demo credentials

| Name | Password | Role |
| --- | --- | --- |
| Abebe Kebede | addis123 | customer |
| Kitchen Staff | kitchen123 | staff |

---

## Route protection table

Every private route has at least two independent layers, and every mutating action re-checks
server-side. The fourth column states what each layer actually proves — not just that it exists.

### `/checkout`

| Layer | Where | Check | Proves |
| --- | --- | --- | --- |
| Proxy (middleware) | `src/proxy.js:38` | `!session && isPrivateRoute(pathname)` + `verifySessionToken(cookie)` | Token is signed, unexpired, structurally valid |
| Page | `src/app/checkout/page.js:15` | `requireSession("/checkout")` | Session re-verified independently of the proxy |
| Action | `src/app/actions.js:85` — `placeOrder` | `if (!session) return { error }` | Caller is authenticated at write time |

### `/checkout/success`

| Layer | Where | Check | Proves |
| --- | --- | --- | --- |
| Proxy | `src/proxy.js:38` (`/checkout/:path*` matches nested paths) | `verifySessionToken(cookie)` | Token valid — verified live: signed-out request → `307 /signin?next=%2Fcheckout%2Fsuccess` |
| Page | `src/app/checkout/success/page.js:16` | `requireSession("/checkout/success")` | Session re-verified before anything renders |
| Ownership | `src/app/checkout/success/page.js:24` | `getOrderById(id)` → mismatch → `notFound()` | The `?id=` in the URL is never trusted; another account's id yields the not-found page with **no order data** |

### `/orders`

| Layer | Where | Check | Proves |
| --- | --- | --- | --- |
| Proxy | `src/proxy.js:38` | `verifySessionToken(cookie)` | Token valid |
| Page | `src/app/orders/page.js:13` | `requireSession("/orders")` | Session re-verified |
| Scoped query | `src/app/orders/page.js:16-18` | `session.role === "staff" \|\| order.customerName === session.name` | Only the viewer's records (staff see all by design) |

### `/orders/[id]`

| Layer | Where | Check | Proves |
| --- | --- | --- | --- |
| Proxy | `src/proxy.js:38` (`/orders/:path*`) | `verifySessionToken(cookie)` | Token valid |
| Page | `src/app/orders/[id]/page.js:19` | `requireSession()` | Session re-verified |
| Ownership | `src/app/orders/[id]/page.js:26` | `order.customerName !== session.name → notFound()` | Caller owns this specific order; the id is looked up, then authorised |
| API (on every poll) | `src/app/api/orders/[id]/route.js:14` | same ownership test → `404` | Re-checked on every 5 s SWR poll, not just on first render |

### `/kitchen` (staff only)

| Layer | Where | Check | Proves |
| --- | --- | --- | --- |
| Proxy | `src/proxy.js:51-53` | `session.role !== "staff" → redirect("/orders")` | Token valid **and** role is staff |
| Page | `src/app/kitchen/page.js:13-15` | `requireSession()` + role check | Re-verified independently — verified live: customer session → `307 /orders` |
| Actions | `updateOrderStatus` (`src/app/actions.js:162`) | `session.role !== "staff"` inside the action | A customer who forges a request is refused on **role**, not on session |

### Public routes (no protection, by decision)

| Route | Who | Why it is open |
| --- | --- | --- |
| `/`, `/menu`, `/menu/[slug]` | Everyone | Public and indexable — `robots.txt` allows `/` and `/menu` |
| `/cart` | Everyone | Client-only state; nothing private to leak (`noindex`) |
| `GET /api/dishes` | Everyone | Public menu data, needed by the debounced search |
| `/sitemap.xml`, `/robots.txt` | Everyone | Discovery files; private routes are excluded |

---

## Server actions

### `signIn` / `signOut`

| Layer | Where | Check | Proves |
| --- | --- | --- | --- |
| Credential match | `src/app/actions.js:65-72` | name + password against `DEMO_ACCOUNTS` | Only the two demo identities can authenticate |
| Redirect safety | `src/app/actions.js:54` → `sanitizeNextPath` | rejects absolute, `//`, `\\` and control-character targets | The `next` parameter cannot send a signed-in user off-site |
| `signOut` | `src/app/actions.js:78-81` | `clearSession()` | Removes the browser cookie (token expiry is unchanged — see limitations) |

### `placeOrder`

| Layer | Where | Check | Proves |
| --- | --- | --- | --- |
| Session | `src/app/actions.js:85` | `if (!session) return { error: "Please sign in before placing an order." }` | Caller is authenticated at write time |
| Ownership | `src/app/actions.js:102` | `raw.customerName = session.name` (overwrite) | `customerName` is always the signed-in user — the form field is ignored |
| Integrity | `src/app/actions.js:29-49`, called at `:104-110` (`normaliseOrderItems`) | id must exist in `getDishes()`; `name`/`price` re-read from the catalogue | A hand-written request cannot set `price: 1` — verified: `{"id":"d1","price":1}` was stored as **450** |

### `cancelOrder`

| Layer | Where | Check | Proves |
| --- | --- | --- | --- |
| Session | `src/app/actions.js:126-127` | `if (!session) return { error: "You must be signed in…" }` | Caller is authenticated |
| Ownership | `src/app/actions.js:134-135` | `session.role !== "staff" && order.customerName !== session.name` | Caller owns the order (or is staff) |

### `updateOrderStatus` (kitchen workflow)

| Layer | Where | Check | Proves |
| --- | --- | --- | --- |
| Session | `src/app/actions.js:158-159` | `if (!session) return { error }` | Signed-out callers are refused |
| Role | `src/app/actions.js:162-163` | `session.role !== "staff"` → refused | Authorisation, not authentication: a valid *customer* session is refused here |
| Value | `src/app/actions.js:167-168` | whitelist `pending/preparing/delivering/delivered/cancelled` | No arbitrary status can be written |
| Existence | `src/app/actions.js:171-173` | unknown id → refused | Nothing mutates for an id that does not exist |

---

## API routes

| Route | Session | Ownership / integrity |
| --- | --- | --- |
| `GET /api/dishes` | none (public) | n/a |
| `POST /api/orders` | `src/app/api/orders/route.js:9` → `401` | `:23` overwrite `customerName` with session; `:26-45` canonical price from the menu; unknown dish id → `422` |
| `GET /api/orders/[id]` | `:7` → `401` | `:14` owner-or-staff → otherwise `404` (verified live: stranger `404`, signed out `401`) |

---

## Scoped queries

Every data read is scoped to the session. No query trusts an id sent by the browser for ownership purposes.

```
/orders page          → getOrders().filter(o => session.role === "staff" || o.customerName === session.name)
/orders/[id] page     → getOrderById(id) then notFound() on owner mismatch
/checkout/success     → getOrderById(id) then notFound() on owner mismatch
cancelOrder action    → find by id, then customerName === session.name (or staff)
updateOrderStatus     → staff-only role check before any mutation
placeOrder action     → customerName = session.name (overwrite, never trust the form)
POST /api/orders      → body.customerName = session.name (overwrite) + canonical price
GET /api/orders/[id]  → getOrderById(id) then 404 on owner mismatch
```

---

## The three attacks

Server Actions are not callable by name from the console, so `src/app/ActionConsole.jsx` binds the two
mutating actions to `window` for the demo. **This adds no power** — both still re-check session, role and
ownership on the server before doing anything; a button on the page would do exactly the same work.

Open the deployed app, sign in/out as noted, press <kbd>F12</kbd> → Console.

### Attack 1 — Signed out

```js
// You: signed OUT, on any page (e.g. the home page)
await cancelOrder("order-1791628935539");
// → { error: "You must be signed in to cancel an order." }   (refused, not a crash)
```

**Line that refused it:** `src/app/actions.js:126-127`

```js
if (!session) {
  return { error: "You must be signed in to cancel an order." };
}
```

### Attack 2 — Signed in as someone else (IDOR)

```js
// You: signed in as "Abebe Kebede", calling with an order that belongs to another customer
await cancelOrder("<another customer's order id>");
// → { error: "You don't own this order." }
```

**Line that refused it:** `src/app/actions.js:134-135`

```js
if (session.role !== "staff" && order.customerName !== session.name) {
  return { error: "You don't own this order." };
}
```

The session check **passes** (you are logged in) — the ownership check is what refuses it, which is the
correct layer. "Refused by session" would mean the check sits in the wrong place.

**Also try the URL attack:** change the id in `/orders/<id>` to another account's order id.
The scoped lookup returns the not-found page and the response body contains **no** phone, address or item
data (verified: `grep 0912345678` on a stranger's response → no match).

**Bonus — role check on a staff action:**

```js
// You: signed in as the customer (not staff)
await updateOrderStatus("<any order id>", "delivered");
// → { error: "Only kitchen staff can update an order status." }   src/app/actions.js:162-163
```

### Attack 3 — Open redirect

```
/signin?next=https://example.com
```

* **Signed out:** the page renders with `next=https://example.com` in the hidden field; after you sign in,
  `src/app/actions.js:54` sanitises it and you land on **`/`**.
* **Already signed in:** `src/proxy.js:33` sanitises it before redirecting — you land on **`/orders`**
  (the proxy sends a bare `/` to `/orders`, so the demo answer for a signed-in caller is `/orders`).

**Line that stopped it:** `src/lib/session.js:10-25` (`sanitizeNextPath`, duplicated in `src/proxy.js:4`)

```js
if (
  !next ||
  !next.startsWith("/") ||      // rejects https://example.com
  next.startsWith("//") ||      // rejects //evil.com (protocol-relative)
  next.includes("\\") ||        // rejects /\evil.com
  /[\u0000-\u001f]/.test(next)  // rejects control characters
) {
  return "/";
}
```

---

## Verification log

Run against a production build (`npm run build && npm run start`) and the deployed URL, 2026-10-10.

| Check | Command / action | Observed |
| --- | --- | --- |
| Proxy is active | `curl -I /orders` | `307 /signin?next=%2Forders` |
| Nested private route | `curl -I /checkout/success` (signed out) | `307 /signin?next=%2Fcheckout%2Fsuccess` |
| Staff-only page | `curl -I /kitchen` with a customer session | `307 /orders` |
| Ownership — API | `GET /api/orders/<id>` stranger / signed out | `404` / `401` |
| Ownership — page | `GET /orders/<id>` stranger | not-found page, **no order data in the body** |
| Price integrity | `POST /api/orders` with `price: 1` | stored as `450`, `customerName` overwritten |
| Unknown dish id | `POST /api/orders` with `id: "nope"` | `422 {"error":"Cart items could not be matched to the menu."}` |
| Open redirect | `/signin?next=https://example.com` | redirected to `/` after sign-in |
| **Deployed** proxy | `curl -I https://addiseatsnext.vercel.app/orders` (signed out) | `307 /signin?next=%2Forders` |
| **Deployed** console attacks | `cancelOrder` / `updateOrderStatus` found in `/_next/static/immutable/chunks/0rfin9nytpukl.js` | both actions reachable from the live console |
| Lighthouse (deployed) | Lighthouse CLI vs `https://addiseatsnext.vercel.app` | perf 95/96/97, LCP 1.60/2.20/2.28 s, CLS 0 — numbers in PERF.md |
| Lint / build | `npx eslint src`, `npm run build` | clean, no warnings |

---

## What AUTH.md does NOT cover

- **Password hashing:** this is a demo with hardcoded credentials; no real password storage exists
- **Session revocation:** sign-out clears the browser cookie only; the signed token is valid until its 7-day expiry
- **Registration:** there is no user registration; credentials are fixed at `DEMO_ACCOUNTS` in `actions.js`
- **`window.cancelOrder` / `window.updateOrderStatus`:** an intentional demo affordance in
  `src/app/ActionConsole.jsx` so the console attacks above can be run. Delete that component for a real
  deployment — the buttons on `/orders/[id]` and `/kitchen` keep working without it.

These limitations are intentional for a classroom demo and are listed in README.md.
