# Addis Eats Data & Fetching

This project follows the week-9 rule: server whenever the person is not triggering the query, and client only for interaction-driven reads that must refresh from input.

## Route and data map

| Area | Where it runs | Key | Refresh rule | Why |
| --- | --- | --- | --- | --- |
| Menu and dishes | Server | `getDishes()` in `src/lib/dishes.js` | The page sets `revalidate = 3600`, but the cookie-reading root layout currently makes routes dynamic | Public content, indexable; decouple auth UI from the root layout before expecting static/ISR delivery |
| Order history | Server | `getOrders().filter(...)` in `src/app/orders/page.js` | Server-rendered per request | Personal data must be scoped to the signed-in user |
| Live order status | Server then client | `OrderStatusClient` in `src/app/orders/[id]/OrderStatusClient.jsx` | Poll every 5s with `refreshInterval` | The view is user-specific but the status should refresh without a full reload |
| Menu search | Client | `useSWR` + debounced input in `src/app/menu/FilterShell.jsx` | Trigger after 350ms pause | Typing is user-driven; per-keystroke requests are wasteful |
| Cart | Client store | `src/lib/providers.jsx` | Local component state | Cart contents stay in-browser and never need server persistence |
| Checkout and order creation | Server action | `placeOrder` in `src/app/actions.js` | One write on submit | The action verifies the signed-in user before writing |

## Ownership rules

- `/orders` and `/orders/[id]` only show records for the current session.
- Staff users can see all orders; customer users can only view their own.
- Any action that mutates order state must re-check ownership before it runs.

## Seed strategy

Where a client-only fetch is unavoidable, the app seeds the first result on the server and passes it as `fallbackData` to SWR. This prevents a visible spinner on data we already have.

## Demo storage limitation

`src/lib/orders.js` stores orders in a process-local array. Orders can disappear on process restart and are not shared across serverless instances, so order history and ownership checks are suitable for a local demo only. Persist orders and associate them with a stable user ID in a database before relying on them in a deployed app.

## Data decisions summary

- Public menu data stays server-side; the root layout's session lookup currently prevents the route from being statically rendered.
- Personal order data stays scoped to the session.
- Search and live status are the only client-driven reads.
- Client state is used only for cart behavior and UI interaction, never for private data.
