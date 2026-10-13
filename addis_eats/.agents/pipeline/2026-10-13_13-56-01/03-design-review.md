# Design Review — OG Images, Mobile Responsiveness & Interactive Landing Page
## Revision 2 Review

---

## Findings

### 1. [MEDIUM] FilterShell fix has duplicate, conflicting `gap` classes

**Where:** Section 2b, "Fix 1 — Sort/count row overflow".

**Problem:** The proposed class string is:
```
"flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-4 border-b border-neutral-800 pb-4 text-sm text-neutral-400"
```
Both `gap-2` and `gap-4` appear at the base (non-responsive) level. In Tailwind v4 the last declaration in the generated CSS wins, but the class order in JSX is non-deterministic — the implementer cannot reliably predict which value applies on mobile. The `gap-4` was copied from the original source and left in without removing it.

**Fix:** Remove `gap-4` from the base classes. Use `gap-2` for mobile and `sm:gap-4` for desktop:
```jsx
<div className="flex flex-col gap-2 border-b border-neutral-800 pb-4 text-sm text-neutral-400
                sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
```

---

### 2. [MEDIUM] `use-server.md` cited under the wrong path; design claims the file validates a key architectural choice without having checked the actual path

**Where:** Section 2a, MobileNav architecture — "the in-repo Next.js docs (`use-server.md`) confirm that client components can import and call Server Actions from dedicated `"use server"` files."

**Problem:** The design references the file as if it lives at `node_modules/next/dist/docs/use-server.md`. That path **does not exist**. The actual path is `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md`. AGENTS.md requires checking in-repo docs before writing code; citing the wrong path means a coder following the design literally will look in the wrong place and potentially skip the check entirely.

The architectural claim itself is correct (the in-repo doc at the real path does confirm client components can import Server Actions from dedicated `"use server"` files). But the cited path is fabricated, which undermines the "verified" status.

**Fix:** Replace the path reference with the correct one:
```
node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md
```

---

### 3. [MEDIUM] `layout.js` will have a dead `signOut` import after the MobileNav refactor

**Where:** Section 2a, "Layout changes in `src/app/layout.js`".

**Problem:** `layout.js` currently imports `signOut` from `@/app/actions`. After the refactor, `MobileNav` owns all sign-out forms and imports `signOut` directly — the import in `layout.js` becomes unused. The design's file-change summary does not mention removing it. An unused `"use server"` function import in a Server Component is not merely untidy; it is a latent risk: if ESLint or the build is configured to error on unused imports, it fails the build. Even without that, it leaves the layout with dead code that future maintainers may misread as intentional.

**Fix:** Add an explicit line to the layout.js change instructions:
> Remove `import { signOut } from "@/app/actions"` from `layout.js`; that import moves to `MobileNav.jsx`.

---

### 4. [MEDIUM] `FeaturedDishCard` uses `group-hover:text-amber-400` but `amber-300 === amber-400` (`#15803d`) — the hover colour change is invisible

**Where:** Section 3, FeaturedDishCard JSX snippet:
```jsx
<strong className="font-serif text-base font-medium text-neutral-100
                   transition-colors group-hover:text-amber-400">
```

**Problem:** The dish name starts as `text-neutral-100` (`#17211b`, near-black) and transitions on hover to `text-amber-400` (`#15803d`, dark green). This is a valid visible change. However, the design's own colour table states `amber-300 = amber-400 = #15803d`. The price span also uses `text-amber-400`. The `DishCard.jsx` (the existing card in the menu page) uses `group-hover:text-amber-300` for the same hover effect on dish names. Using `amber-400` here is technically functional but silently inconsistent with the existing card style. If a future developer adds `hover:bg-amber-300` thinking it differs from `amber-400`, they will encounter the invisible-hover bug the design explicitly warns against elsewhere.

**Fix:** Change the dish name hover class to match existing `DishCard.jsx` convention:
```jsx
group-hover:text-amber-300
```
This is identical in rendering today but maintains the convention used everywhere else in the codebase.

---

### 5. [NIT] Hamburger tap-target math in the comment is wrong

**Where:** Section 2a, MobileNav structure comment:
> "p-2.5 giving a 44 × 44 px touch area (2.5 × 4 × 4 = 40 px padding; at base font-size the SVG icon is 24 px; total interactive area is 44 px with padding)"

**Problem:** `2.5 × 4 × 4 = 40` is nonsensical — the formula has an unexplained extra `× 4`. The correct calculation is: `p-2.5` = 2.5 × 4 px = **10 px per side**; 10 × 2 sides = 20 px total padding; 24 px icon + 20 px padding = **44 px total**. The final result (44 px) is correct, but the stated formula is wrong and will mislead anyone checking the math.

**Fix:** Replace with the correct formula:
> "p-2.5 = 2.5 × 4 px = 10 px padding per side; 24 px icon + 2 × 10 px = 44 px total tap area"

---

### 6. [NIT] Design does not mention removing `getSession` import from `layout.js` after session is passed differently — minor, but `session` is still fetched at layout level (this is intentional and correct; no change needed)

**Where:** Section 2a.

**Clarification only:** `layout.js` calls `getSession()` and passes `session` as a prop to `MobileNav`. This is correct because `layout.js` is a Server Component and can call `getSession()` directly; MobileNav is a Client Component and cannot. The design's prop `{ session }` is the right pattern. No change needed; flagged as NIT for implementer clarity.

**Fix (clarification comment to add):**
```js
// layout.js keeps getSession() — the session is fetched server-side and passed
// as a plain serializable prop to <MobileNav session={session} />.
```

---

## Verified Assumptions

| Claim in Design | Result |
|---|---|
| `generateMetadata` is already fully implemented in `src/app/menu/[slug]/page.jsx` with correct `openGraph.images` pointing to `/og/dishes/<slug>.jpg` | ✅ Confirmed — code reads the same as described, uses `absoluteUrl()`, sets `twitter.card` |
| All 13 `toSlug()` values are byte-identical to the OG JPEG filenames in `public/og/dishes/` | ✅ Confirmed — all 13 slugs verified against actual directory listing |
| `getDishCardImage()` transforms `/dishes/<name>.webp` → `/dishes/display/card/<name>.webp` | ✅ Confirmed — `dishes.js` does exactly `image.replace("/dishes/", "/dishes/display/card/")` |
| Featured dish card images for d1, d8, d9, d11 all exist in `public/dishes/display/card/` | ✅ Confirmed — `doro-wat.webp`, `addis-double-smash.webp`, `crispy-chicken-burger.webp`, `ethiopian-coffee.webp` all present |
| `getDishes()` returns d1=Special Doro Wat, d8=Addis Gourmet Double Smash, d9=Crispy Zesty Chicken Burger, d11=Traditional Buna | ✅ Confirmed — IDs and names match exactly |
| The layout title template is `"%s | Addis Eats"` | ✅ Confirmed — `layout.js` has `title: { template: "%s | Addis Eats" }` |
| `layout.js` uses `signOut` inline in `<form action={signOut}>` | ✅ Confirmed |
| `layout.js` passes `session = await getSession()` at layout level | ✅ Confirmed |
| `getSession()` returns `{ name, role }` or null | ✅ Confirmed — `session-token.js` encodes `{ name, role, expiresAt }` |
| `FilterShell.jsx` already has `flex flex-col` + `sm:flex-row` responsive pattern on the search container | ✅ Confirmed — line 62-64 of `FilterShell.jsx` |
| `FilterShell.jsx`'s sort/count row currently uses `flex flex-wrap items-center justify-between gap-4` (the one needing the fix) | ✅ Confirmed — line 88 |
| `CategoryBar.jsx` currently uses `flex flex-wrap gap-2` on the container | ✅ Confirmed |
| `CartItems.jsx`'s `<li>` uses `flex justify-between` with no stacking on mobile | ✅ Confirmed |
| `CartItems.jsx`'s Remove button has no explicit min tap target | ✅ Confirmed — class is just `text-neutral-500 hover:text-red-400 text-sm` |
| `CheckoutForm.jsx` inputs use `text-sm` (below 16 px iOS zoom threshold) | ✅ Confirmed — both `type="tel"` and `type="text"` inputs lack explicit font size (inherit `text-sm` from context) |
| `globals.css` uses Tailwind v4 `@theme inline` for colour overrides | ✅ Confirmed |
| Colour values in the design's colour table match `globals.css` exactly | ✅ Confirmed — all hex values identical |
| `amber-300` and `amber-400` are both `#15803d` (identical) | ✅ Confirmed |
| `emerald-500` in this theme is `#38bdf8` (light blue, not standard Tailwind green) | ✅ Confirmed |
| `DishCard.jsx` uses `hover:border-emerald-500/70` | ✅ Confirmed |
| `src/components/` directory does not exist | ✅ Confirmed — no such directory in the repo |
| `src/app/error.js` exists and handles propagated async errors | ✅ Confirmed |
| `font-serif` class is used throughout the codebase (not a new addition) | ✅ Confirmed — used in 10+ files; resolves to browser default serif |
| Client components can import Server Actions from dedicated `"use server"` files | ✅ Confirmed — per actual in-repo doc at `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md` |
| `MobileNav.jsx` does not yet exist | ✅ Confirmed — no file found |

---

## Unverified / Wrong Assumptions

| Claim in Design | Status |
|---|---|
| "the in-repo Next.js docs (`use-server.md`) confirm…" — implies the file is at `node_modules/next/dist/docs/use-server.md` | ❌ **Wrong path.** File is at `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md`. The architectural conclusion is correct but the cited path does not exist. |
| The FilterShell fix produces a non-conflicting class list | ❌ **Wrong.** The proposed class string contains both `gap-2` and `gap-4` at the base breakpoint — a conflict that must be resolved (see Finding #1). |
| `layout.js` after refactor needs no import cleanup | ❌ **Incomplete.** The design's layout.js change table omits removing the now-unused `signOut` import (see Finding #3). |
| `FeaturedDishCard` using `group-hover:text-amber-400` matches the codebase convention | ❌ **Inconsistent.** Existing `DishCard.jsx` uses `group-hover:text-amber-300`. Both are `#15803d` today, but the convention is `amber-300` (see Finding #4). |

---

## Verdict

**4 HIGH/MEDIUM findings → CHANGES_REQUESTED**

The core architecture is sound and all major prior-review findings were addressed. The four remaining findings are targeted fixes with concrete resolutions; none require structural redesign.
