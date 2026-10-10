# Addis Eats — Authentication & Authorisation

## Session

- **Cookie name:** `session`
- **Signing:** HMAC-SHA-256 via Web Crypto API (`src/lib/session-token.js`)
- **Verification:** constant-time byte comparison (prevents timing attacks)
- **Flags:** `HttpOnly`, `SameSite=lax`, `Secure` (production only), `maxAge` 7 days
- **Storage:** stateless signed token — no database lookup required
- **Revocation:** sign-out deletes the browser cookie; the token remains valid until expiry (acknowledged limitation for a demo)
- **Secret:** `AUTH_SECRET` env var; production startup throws if missing

## Demo credentials

| Name | Password | Role |
| --- | --- | --- |
| Abebe Kebede | addis123 | customer |
| Kitchen Staff | kitchen123 | staff |

---

## Route protection table

Every private route has three independent layers. The fourth column states what each layer actually proves — not just that it exists.

### `/checkout`

| Layer | Where | Check | Proves |
| --- | --- | --- | --- |
| Middleware | `src/proxy.js` | `verifySessionToken(cookie)` | Token is signed, unexpired, structurally valid |
| Page | `src/app/checkout/page.js` | `requireSession("/checkout")` | Session re-verified independently of middleware |
| Action | `src/app/actions.js` — `placeOrder` | `getSession()` → error if null | Caller is authenticated at write time |

### `/orders`

| Layer | Where | Check | Proves |
| --- | --- | --- | --- |
| Middleware | `src/proxy.js` | `verifySessionToken(cookie)` | Token is signed, unexpired, structurally valid |
| Page | `src/app/orders/page.js` | `requireSession("/orders")` | Session re-verified; filter applied: `order.customerName === session.name` |
| API | `src/app/api/orders/[id]/route.js` | `getSession()` + ownership check | Caller authenticated AND owns the order |

### `/orders/[id]`

| Layer | Where | Check | Proves |
| --- | --- | --- | --- |
| Middleware | `src/proxy.js` (via `/orders/:path*`) | `verifySessionToken(cookie)` | Token valid |
| Page | `src/app/orders/[id]/page.js` | `requireSession()` + `order.customerName !== session.name → notFound()` | Session valid AND caller owns this specific order |
| API | `src/app/api/orders/[id]/route.js` | `getSession()` + `order.customerName !== session.name → 404` | Re-checked on every poll (SWR calls this route every 5 s) |

### `/kitchen`

| Layer | Where | Check | Proves |
| --- | --- | --- | --- |
| Middleware | `src/proxy.js` | `verifySessionToken(cookie)` + `session.role !== "staff" → redirect` | Token valid AND role is staff |
| Page | `src/app/kitchen/page.js` | `requireSession()` + `session.role !== "staff" → redirect("/orders")` | Re-verified independently |
| Actions | (no mutation actions on kitchen yet) | — | — |

### `cancelOrder` (Server Action)

| Layer | Where | Check | Proves |
| --- | --- | --- | --- |
| Session | `src/app/actions.js:42` | `if (!session) return { error: "..." }` | Caller is authenticated |
| Ownership | `src/app/actions.js:51` | `session.role !== "staff" && order.customerName !== session.name` | Caller owns the order (or is staff) |

### `placeOrder` (Server Action)

| Layer | Where | Check | Proves |
| --- | --- | --- | --- |
| Session | `src/app/actions.js:62` | `if (!session) return { error: "..." }` | Caller is authenticated |
| Ownership | `src/app/actions.js:72` | `raw.customerName = session.name` (overwrite) | `customerName` is always the signed-in user — form field is ignored |

---

## Scoped queries

Every data read is scoped to the session. No query trusts an id sent by the browser for ownership purposes.

```
/orders page        → getOrders().filter(o => o.customerName === session.name)
/orders/[id] page   → getOrderById(id) then notFound() if owner mismatch
cancelOrder action  → find by id, then check customerName === session.name
placeOrder action   → customerName = session.name (overwrite, never trust form)
POST /api/orders    → body.customerName = session.name (overwrite)
GET /api/orders/[id]→ getOrderById(id) then 404 if owner mismatch
```

---

## The three attacks

Run these from the browser console on the deployed app to verify each layer.

### Attack 1 — Signed out

```js
// Call cancelOrder while not signed in
await cancelOrder("ord_812");
// Expected: refused, not a crash
// Actual:   { error: "You must be signed in to cancel an order." }
```

**Line that stopped it:** `src/app/actions.js` line 42
```js
if (!session) {
  return { error: "You must be signed in to cancel an order." };
}
```

---

### Attack 2 — Signed in as someone else (IDOR)

```js
// Sign in as "Abebe Kebede", then call cancelOrder with an order
// that belongs to a different customer
await cancelOrder("<another-customers-order-id>");
// Expected: refused on OWNERSHIP, not on session
// Actual:   { error: "You don't own this order." }
```

**Line that stopped it:** `src/app/actions.js` line 51
```js
if (session.role !== "staff" && order.customerName !== session.name) {
  return { error: "You don't own this order." };
}
```

The session check passes (the attacker is logged in). The ownership check is what refuses it — which is correct. "Refused by session" would mean the check is on the wrong layer.

**Also try the URL attack:** change the id in `/orders/abc123` to another user's order id.
A scoped query returns `notFound()` — the page returns 404 rather than leaking data.
Unscoped query would return the other user's order. Ours does not.

---

### Attack 3 — Open redirect

```
/signin?next=https://example.com
// Expected: lands on /, not on https://example.com
// Actual:   redirects to /
```

**Line that stopped it:** `src/lib/session.js` — `sanitizeNextPath()` (called inside the `signIn` action)
```js
export function sanitizeNextPath(value) {
  if (typeof value !== "string") return "/";
  const next = value.trim();
  if (
    !next ||
    !next.startsWith("/") ||   // rejects https://example.com
    next.startsWith("//") ||   // rejects //evil.com (protocol-relative)
    next.includes("\\") ||     // rejects /\evil.com
    /[\u0000-\u001f]/.test(next) // rejects control characters
  ) {
    return "/";
  }
  return next;
}
```

`https://example.com` does not start with `/`, so `sanitizeNextPath` returns `"/"`. The same function runs in `src/proxy.js` for the middleware redirect path.

---

## Open-redirect defence detail

The brief specifically requires checking `//evil.com` (protocol-relative bypass). This is covered:
- `next.startsWith("//")` → returns `"/"`

And `\evil.com` (backslash bypass):
- `next.includes("\\")` → returns `"/"`

---

## What AUTH.md does NOT cover

- Password hashing: this is a demo with hardcoded credentials; no real password storage exists
- Session revocation: sign-out clears the browser cookie only; the signed token is valid until its 7-day expiry
- Registration: there is no user registration; credentials are fixed at `DEMO_ACCOUNTS` in `actions.js`

These limitations are intentional for a classroom demo and documented in README.md.
