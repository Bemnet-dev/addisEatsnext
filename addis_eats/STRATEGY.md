# Rendering Strategy

This document records the current App Router routes, their production rendering strategy, and the reason for each choice. Paths below are relative to `src/`.

## Current production build

Verified with `npm run build` on 2026-09-29. The current production route table is:

```
Route (app)                 Revalidate  Expire
┌ ○ /
├ ○ /_not-found
├ ƒ /api/dishes
├ ƒ /api/dishes/[id]
├ ƒ /api/orders
├ ○ /cart
├ ƒ /checkout
├ ƒ /checkout/success
├ ○ /menu                           1h      1y
└   /menu/[slug]
  ├ ● /menu/lentil-sambusa
  ├ ● /menu/azifa
  ├ ● /menu/timatim-fitfit
  ├ ● /menu/doro-wat
  ├ ● /menu/beef-tibs
  ├ ● /menu/vegetarian-bayenetu
  ├ ● /menu/shiro-tegamino
  ├ ● /menu/honey-baklava
  ├ ● /menu/himbasha
  ├ ● /menu/ethiopian-coffee
  ├ ● /menu/spiced-tea
  ├ ● /menu/mango-juice
  └ ● /menu/avocado-smoothie
```

`○` means prerendered static output, `●` means statically generated from `generateStaticParams`, and `ƒ` means rendered on demand.

## Strategy per route

| Route | Strategy | Reason |
| --- | --- | --- |
| `/` | Static (`○`) | The landing page has no request-specific data. |
| `/menu` | ISR (`○`, revalidate hourly) | The server loads dishes; the output can be reused and refreshed after one hour. |
| `/menu/[slug]` | SSG (`●`) | `generateStaticParams()` returns the 13 current dish slugs, which are generated at build time. |
| `/cart` | Static shell (`○`) with client state | The cart page reads the browser-side cart context; the route shell itself is not personalized on the server. |
| `/checkout` | Dynamic (`ƒ`) | `src/app/checkout/page.js` explicitly sets `dynamic = "force-dynamic"`; the interactive form is a Client Component. |
| `/checkout/success` | Dynamic (`ƒ`) | The page awaits `searchParams` to render the order ID. |
| `/api/dishes` | Dynamic (`ƒ`) | A GET Route Handler returns the current dish data. |
| `/api/dishes/[id]` | Dynamic (`ƒ`) | A GET Route Handler looks up a dish by request path ID. |
| `/api/orders` | Dynamic (`ƒ`) | A POST Route Handler validates the request and creates an order. |
| `/_not-found` | Static (`○`) | Next.js generates the not-found route from the app's not-found UI. |

Rendering strategy and component execution are separate: a static route may contain Client Components that hydrate in the browser.

## Current source tree

The `src/app` folder defines the routes; `src/lib` contains shared application modules.

```
src/
├── app/
│   ├── actions.js
│   ├── api/
│   │   ├── dishes/route.js
│   │   ├── dishes/[id]/route.js
│   │   └── orders/route.js
│   ├── cart/page.js
│   ├── checkout/
│   │   ├── page.js
│   │   ├── CheckoutForm.jsx
│   │   └── success/
│   │       ├── page.js
│   │       └── ClearCartOnMount.jsx
│   ├── menu/
│   │   ├── [slug]/page.jsx
│   │   ├── AddToCartButton.jsx
│   │   ├── CategoryBar.jsx
│   │   ├── DishList.jsx
│   │   ├── FilterShell.jsx
│   │   ├── error.js
│   │   ├── layout.js
│   │   ├── loading.js
│   │   ├── not-found.js
│   │   ├── page.js
│   │   └── slug.js
│   ├── error.js
│   ├── layout.js
│   ├── loading.js
│   ├── not-found.js
│   └── page.js
└── lib/
    ├── dishes.js
    ├── orders.js
    ├── providers.jsx
    └── schema.js
```

## Layouts and special files

- `src/app/layout.js` owns the document shell, header, navigation, footer, and shared cart provider.
- `src/app/menu/layout.js` is a nested width wrapper shared by the menu and dish detail routes. It does not render a category sidebar; category controls are in `FilterShell`.
- Root and menu `loading.js` files provide segment loading UI.
- Root and menu `error.js` files provide error boundaries; Next.js requires error boundary components to be Client Components.
- Root `not-found.js` provides global not-found UI. `menu/not-found.js` is used for unknown dish slugs.
- `src/app/actions.js` defines the `placeOrder` and `cancelOrder` Server Actions.

## Verification recorded

The production build succeeds and its route markers match the strategy table above. A production HTTP sweep returned `200` for the page routes and all 13 generated dish pages. API checks returned `200` for the dish list, `404` for an unknown dish, `201` for a valid order, and `422` for invalid name, invalid phone, and empty items.

One security check failed: a POST with a valid customer but a forged dish name and price was accepted with `201`. The API and Server Action currently validate the shape of submitted items, but do not reload canonical dish data and verify submitted names/prices. Do not describe order item prices as tamper-proof until that is fixed.

The assignment's six production failure checks, including the JavaScript-disabled check, have not all been demonstrated. Do not mark that requirement complete based only on the checks listed above.
