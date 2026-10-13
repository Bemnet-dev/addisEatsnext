# Client / Server Boundaries

This document describes the current component execution boundaries. Paths are relative to `src/`.

## The rule

- A **Server Component** is the default. It can access server-only data and is rendered on the server; its component implementation is not sent as browser JavaScript.
- A **Client Component** starts at a file marked with `"use client"`. It can use state, effects, event handlers, and browser APIs. Its client dependency graph is included in the browser bundle.
- A static route can still contain Client Components. Route rendering strategy (static, ISR, SSG, or dynamic) is separate from component boundary.

## Explicit Client Component entry points

There are 15 files marked with `"use client"`:

| File | Why it is client-side |
| --- | --- |
| `src/lib/providers.jsx` | Owns the cart context and state used across routes. |
| `src/app/ActionConsole.jsx` | Toggleable developer console; owns open/closed UI state. |
| `src/app/cart/CartItems.jsx` | Reads cart context (`useCart`) and handles item removal. The page shell (`cart/page.js`) is a server component. |
| `src/app/checkout/CheckoutForm.jsx` | Uses `useActionState`, cart context, form submission, and pending state. |
| `src/app/checkout/success/ClearCartOnMount.jsx` | Uses an effect to clear cart state after confirmation renders. |
| `src/app/home/OpenStatus.jsx` | Reads the visitor's clock to show a live open/closed pill on the landing page. |
| `src/app/kitchen/OrderStatusControls.jsx` | Sends staff status changes through the `updateOrderStatus` action. |
| `src/app/menu/CategoryBar.jsx` | Handles category selection clicks. |
| `src/app/menu/FilterShell.jsx` | Owns category and sorting state. |
| `src/app/menu/AddToCartButton.jsx` | Adds the current dish to cart and displays feedback. |
| `src/app/orders/[id]/OrderStatusClient.jsx` | Polls `GET /api/orders/[id]` with SWR for live status. |
| `src/app/orders/[id]/CancelOrderButton.jsx` | Confirms and submits an order cancellation. |
| `src/app/signin/SignInForm.jsx` | Handles form input and submits the sign-in action. |
| `src/app/error.js` | Root error boundary; uses the `reset` callback and is required to be client-side by Next.js. |
| `src/app/menu/error.js` | Menu-segment error boundary; uses `reset` and is required to be client-side. |

## Server Components and server modules

These route components do not declare `"use client"`:

| File | Why it stays server-side |
| --- | --- |
| `src/app/layout.js` | Owns the document `<html>` and `<body>`, shared shell, and provider placement. |
| `src/app/page.js` | Renders the dynamic landing page: awaits `getDishes()`, derives course sections, signature picks and the Addis-time greeting, and renders `OpenStatus` as a client leaf. |
| `src/app/menu/layout.js` | Wraps menu routes in a shared width container. |
| `src/app/menu/page.js` | Awaits `getDishes()` and passes the serializable data to `FilterShell`. |
| `src/app/menu/[slug]/page.jsx` | Awaits route params/data, resolves the dish, and calls `notFound()` when absent. |
| `src/app/checkout/page.js` | Declares the dynamic route and renders the client checkout form. |
| `src/app/checkout/success/page.js` | Awaits `searchParams` and renders the confirmation page. |
| `src/app/not-found.js`, `src/app/menu/not-found.js` | Render not-found UI without client state. |
| `src/app/loading.js`, `src/app/menu/loading.js` | Render loading fallbacks without client state. |
| `src/app/actions.js` | Server Actions marked with `"use server"`. |
| `src/app/api/**/route.js` | HTTP Route Handlers execute on the server. |
| `src/lib/dishes.js`, `src/lib/orders.js`, `src/lib/schema.js` | Data, in-memory order store, and Zod validation used by server routes/actions. |

## Menu boundary detail

`FilterShell.jsx` is a Client Component. It imports both `CategoryBar.jsx` and `DishList.jsx`, and renders `DishList` after filtering and sorting. `DishList.jsx` has no `"use client"` directive of its own, but because it is imported from the client module graph, it is not a server-only island and its code is included in that graph.

The server menu page fetches the dishes and passes them as a serializable `dishes` prop. This keeps data loading on the server, while filtering, sorting, and list rendering happen under the client boundary.

## Home boundary detail

`src/app/page.js` is a Server Component: it awaits `getDishes()` and derives every section from the catalogue — course groups and counts, "from" prices, the signature pick per course, and the greeting/suggested dish from the current hour in `Africa/Addis_Ababa`. Nothing about the menu is hardcoded in the landing page.

`src/app/home/OpenStatus.jsx` is the only client leaf. It is gated on `useEffect` (the server renders a neutral "Kitchen hours" placeholder, the client fills in the real status after mount) so the open/closed answer — which depends on the visitor's current time — never causes a hydration mismatch. It re-checks every minute for long-lived tabs.

The hero reuses `DishCard` from `src/app/menu/DishCard.jsx`, so a landing-page card and a menu card cannot drift apart.

## Other composition patterns

- The server dish-detail page renders `AddToCartButton` as a client leaf. The surrounding dish details remain server-rendered.
- The server checkout page renders `CheckoutForm`, which submits to the `placeOrder` Server Action.
- The root layout renders `Providers`, the client cart-state provider, around the application.
- `src/lib/schema.js` is used by the server action and API route for request validation; the form displays the returned field errors.

## Boundary check

The 15 explicit `"use client"` directives match the table above. Do not count `DishList.jsx` as server-only: it is imported by `FilterShell.jsx`. The most direct way to confirm boundary changes is to search for `"use client"`, inspect imports from those entry points, then compare with the production build output.
