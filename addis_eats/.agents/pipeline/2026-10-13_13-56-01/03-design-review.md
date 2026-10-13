# Design Review — OG Images, Mobile Responsiveness & Interactive Landing Page

Reviewed against: `02-design.md` (design) and `01-requirements.md` (requirements).  
Source verified at: `d:/VS/addisEatsnext/addis_eats`.

---

## Findings

### 1. [HIGH] Hero text colour produces black-on-dark-green — unreadable

**Where:** Design §Feature 3 "Hero section" — `<h1 className="... text-neutral-100 ...">`.

**Problem:** The design states that `neutral-950` is white and `neutral-100` is near-black, and the hero background is `bg-neutral-200`. Checking `globals.css` directly:

```css
--color-neutral-100: #17211b   /* near-black */
--color-neutral-200: #2e3a32   /* dark forest green */
```

The hero renders **dark-green text (`#17211b`) on a dark-green background (`#2e3a32`)**. The contrast ratio is approximately 1.5:1 — unreadable and a WCAG failure. The subheadline uses `text-neutral-400` (`#526159`), which is also dark on the same dark background.

**Concrete fix:** Use `text-neutral-950` (white, `#ffffff`) for the headline and badge text on the hero, and `text-neutral-700` or `text-neutral-800` for the subheadline. Example:

```jsx
<h1 className="relative z-10 font-serif text-5xl font-bold text-neutral-950 ...">
<p className="relative z-10 mt-6 ... text-neutral-800 ...">
```

---

### 2. [HIGH] CTA button text colour is wrong — green text on green background

**Where:** Design §Feature 3 "Hero section" and "Closing CTA banner" — `text-neutral-950` on `bg-amber-400`.

**Problem:** `amber-400` maps to `#15803d` (dark green) and `neutral-950` maps to `#ffffff` (white) in this theme. So the button is white text on dark green, which is readable. **However**, `hover:bg-amber-300` maps to `#15803d` (same value as `amber-400` — `amber-300` and `amber-400` are identical in this theme's override: `--color-amber-300: #15803d` and `--color-amber-400: #15803d`). The hover state produces no visible change.

**Concrete fix:** Use `hover:bg-amber-500` (which maps to `#166534`) for the hover state instead of `hover:bg-amber-300`, or add a distinct override for `amber-300` in `globals.css`:

```css
--color-amber-300: #22c55e;  /* lighter green for hover contrast */
```

---

### 3. [HIGH] `generateMetadata` calls `getDishes()` as `async` but design says it's synchronous

**Where:** Design §Error Handling "Feature 3" — "getDishes() is a synchronous array return (no I/O, no network call). It cannot fail."

**Problem:** `src/lib/dishes.js` actually defines `getDishes` as `async function getDishes()`. It returns a resolved promise, not a plain array. The design's landing page calls `getDishes()` directly and treats the result as synchronous. In an `async` Server Component, this must be `await getDishes()`. The design snippet does not show `await`. If the coder follows the design literally and omits `await`, the `featuredDishes.filter(...)` call receives a Promise, not an array, and `.filter` is undefined — a runtime crash.

**Concrete fix:** The landing page must use:

```js
const allDishes = await getDishes();
const featuredDishes = allDishes.filter(d => ["d1","d8","d9","d11"].includes(d.id));
```

The design must also declare `page.js` as `async function HomePage()`.

---

### 4. [HIGH] `og:title` format in `generateMetadata` does not match FR-1.2

**Where:** Design §Feature 1 "Finding" — "og:title must equal `<Dish Name> | Addis Eats`".

**Status:** This is already implemented correctly in the existing code (`openGraph.title: \`${dish.name} | Addis Eats\``). However, `title: dish.name` (without the suffix) relies on the layout's `template: "%s | Addis Eats"` for the HTML `<title>` tag — that is correct. The design should not instruct the implementer to change this; it correctly identifies it as done. **No code change needed, but the design's wording is ambiguous** — it does not clearly distinguish between the `<title>` tag (uses template) and `og:title` (explicitly set). This ambiguity is a documentation risk. Downgraded to MEDIUM — see finding 5.

*(This finding is superseded by finding 5; see below.)*

---

### 5. [MEDIUM] `og:title` format claim is ambiguous between page `<title>` and OG title

**Where:** Design §Feature 1 and Requirements FR-1.2.

**Problem:** FR-1.2 requires `og:title` = `"<Dish Name> | Addis Eats"`. The existing code has `openGraph.title: \`${dish.name} | Addis Eats\`` — correct. The design's "Finding" section says "correct" without distinguishing the `title` field (which only has the dish name, relying on the template) from `openGraph.title`. An implementer following the design could mistakenly "fix" the `title` field to include the suffix, which would double-append it via the template: `"Special Doro Wat | Addis Eats | Addis Eats"`.

**Concrete fix:** Add an explicit note: "Do not modify the `title` field; the layout template appends `| Addis Eats` automatically. Only the explicit `openGraph.title` value needs the full suffix."

---

### 6. [MEDIUM] Design instructs changing `<main>` padding but claims this doesn't break the landing page — it actually does

**Where:** Design §2f "`<main>` layout constraint" and §Feature 3 "Architecture decision".

**Problem:** The design states the root layout's `<main>` gets `p-4 sm:p-6 lg:p-8` — then also states the landing page hero uses `mx-[-1rem] sm:mx-[-1.5rem] lg:mx-[-2rem]` negative margins to achieve full-bleed, but then says "Design choice: use contained hero with gradient background — this is safer." This creates a contradiction: the design keeps the negative-margin escape trick mentioned in the text but claims to discard it in the same paragraph. The implementer has no single clear instruction.

**Concrete fix:** Remove all mention of the negative-margin bleed approach from the design. The final decision is: hero is contained within `max-w-6xl`, uses a gradient background, no negative margins. State this once and strike the alternative.

---

### 7. [MEDIUM] `MobileNav` props type is underspecified — sign-out form action is a Server Action

**Where:** Design §2a `MobileNav.jsx` — "Props: `{ session: { name, role } | null }`".

**Problem:** The current `layout.js` renders a `<form action={signOut}>` where `signOut` is a Server Action imported from `@/app/actions`. The design says `MobileNav` receives only `{ session: { name, role } | null }` as props, but the sign-out form inside `MobileNav` also needs the `signOut` Server Action. A client component cannot import a Server Action directly without the `"use server"` directive on the action — but `signOut` is already a Server Action. However, the design never specifies how the `signOut` action is passed to `MobileNav`. If the implementer imports `signOut` directly in the client component, that may work, but it is not specified and creates an implicit dependency that could surprise.

**Concrete fix:** Explicitly add `signOut` to the props interface and pass it from the layout:

```ts
Props: { session: { name: string; role: string } | null; signOutAction: () => Promise<void> }
```

Or explicitly state that `MobileNav` imports `signOut` directly from `@/app/actions` (which is valid since Next.js allows client components to call Server Actions).

---

### 8. [MEDIUM] `getDishCardImage()` path transformation is wrong for the featured dishes table

**Where:** Design §Feature 3 "Curated featured dishes" table, last column `Image (card)`.

**Problem:** The design's table lists card image filenames like `doro-wat.webp`, `addis-double-smash.webp`, etc. The `getDishCardImage()` function in `dishes.js` transforms `/dishes/doro-wat.webp` → `/dishes/display/card/doro-wat.webp`. The actual card files confirmed in `public/dishes/display/card/` are:

```
doro-wat.webp ✓
addis-double-smash.webp ✓
crispy-chicken-burger.webp ✓
ethiopian-coffee.webp ✓
```

All four exist — this part is fine. **However**, the design's `FeaturedDishCard` description says "It mirrors the structure of `DishCard.jsx`" but the design never shows an `import getDishCardImage` in `page.js`. The implementer may forget to import it.

**Concrete fix:** Add the import explicitly in the `page.js` code sketch:
```js
import { getDishes, getDishCardImage } from "@/lib/dishes";
```

---

### 9. [MEDIUM] `CategoryBar.jsx` fix uses `scrollbar-none` which is a custom utility that the design adds to `globals.css`, but this is a Tailwind v4 project — arbitrary CSS class usage needs a `@utility` rule, not raw CSS

**Where:** Design §2b `CategoryBar.jsx` and §globals.css snippet.

**Problem:** Tailwind v4 does not automatically recognize arbitrary class names like `scrollbar-none` from a plain CSS rule. In Tailwind v4, custom utilities must be registered with `@utility`:

```css
@utility scrollbar-none {
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}
```

The design adds a plain CSS class (`.scrollbar-none { ... }`) — this works as plain CSS but is not a Tailwind utility, so it cannot be conditionally applied with responsive prefixes (`sm:scrollbar-none`, `md:scrollbar-none`, etc.) if ever needed. More importantly, Tailwind's JIT engine in v4 may purge or ignore it unless declared with `@utility`.

**Concrete fix:** Replace the `.scrollbar-none` CSS block in the design with:

```css
@utility scrollbar-none {
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}
```

---

### 10. [MEDIUM] `FilterShell` — design describes a sort label that doesn't match actual source

**Where:** Design §2b "Fix in FilterShell.jsx" — "Wrap the sort label in `<label className="flex items-center gap-2 min-w-0">`".

**Problem:** The actual `FilterShell.jsx` already has `<label className="flex items-center gap-3">` on the sort label — the `gap-3` vs `gap-2` difference is minor, but more critically the design says add `min-w-0` to the `<select>`. The actual `<select>` has no width constraint at all and is not inside a flex container that constrains it. The fix is valid, but the design's description of the "problem" says "the select may push the label off-screen" — this is incorrect. The label is inside a `flex flex-wrap items-center justify-between` row, so it wraps rather than overflows. The actual risk on 320 px is the sort row and count row stacking oddly. The design's fix is insufficient: the outer row also needs `flex-col gap-2 sm:flex-row` treatment. 

**Concrete fix:** Replace the outer `<div className="flex flex-wrap items-center justify-between gap-4 ...">` with `<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between ...">` so count and sort stack vertically on mobile.

---

### 11. [NIT] `CartItems.jsx` fix changes `<li>` to `flex-col` on mobile but the "Proceed to Checkout" link is a sibling outside the `<ul>`

**Where:** Design §2d "Fix in CartItems.jsx" — "`Proceed to Checkout` `<Link>`: change to `block w-full text-center py-3 ...` on mobile".

**Problem:** Looking at the actual `CartItems.jsx`, the "Proceed to Checkout" `<Link>` is already `inline-block px-6 py-3`, giving a height ≥44 px. The design says to change it to `block w-full` on mobile — this is a reasonable enhancement, but the existing `py-3` already meets the 44 px tap target requirement (FR-2). The design overstates the problem.

**Concrete fix:** Mention that `py-3` on the button already satisfies the tap-target requirement. The `block w-full` change is a UX enhancement, not a required fix. Keep it but label it optional.

---

### 12. [NIT] Next.js version claim is wrong — the design says "Next.js 16.3.5"

**Where:** Design §Overview — "This is a Next.js 16.3.5 app".

**Problem:** `package.json` confirms `"next": "16.3.5"` — this is correct at face value. However, Next.js's public release history as of training data does not include a v16. This is likely a pre-release or internal build. The AGENTS.md rule explicitly warns: "This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/`." The design does not acknowledge this and does not instruct the implementer to check the in-repo docs.

**Concrete fix:** Add a note at the top of the design: "Before writing any code, consult `node_modules/next/dist/docs/` for any API differences in this version of Next.js, per AGENTS.md."

---

### 13. [NIT] Featured dish card described as "sub-component inside page.js (not a separate file)" — conflicts with React Server Component rules

**Where:** Design §Feature 3 "`FeaturedDishCard` is a sub-component inside page.js".

**Problem:** Defining a function component inside a Server Component file is fine. However, if `FeaturedDishCard` needs any client-side behaviour in the future (hover JS, etc.), it can't be extracted to a `"use client"` file after the fact without a refactor. This is a minor maintainability nit, not a blocking issue.

**Concrete fix:** Either accept the inline approach (and note it's intentional) or define `FeaturedDishCard` as a named export in `page.js` but in a comment note that it should be extracted if client interactivity is added.

---

### 14. [NIT] `@keyframes fadeInDown/fadeInUp` in globals.css conflict with Tailwind v4's `@theme` scope

**Where:** Design §Feature 3 "Keyframe animations".

**Problem:** The design uses Tailwind v4's arbitrary animation syntax `animate-[fadeInDown_0.6s_ease_both]`. In Tailwind v4, custom keyframes used with `animation` utilities should be declared inside `@theme` as `--animate-*` tokens, or at minimum at the root CSS level. Placing `@keyframes` inside `@theme inline` would be wrong; placing them outside is correct. The design shows them outside any block — this is correct. However, the `animation-fill-mode: both` shorthand keyword `both` must appear at the right position in the Tailwind arbitrary animation syntax. The design uses `animate-[fadeInDown_0.7s_0.1s_ease_both]` (5 tokens), which maps to `animation: fadeInDown 0.7s 0.1s ease both` — valid CSS. No change needed, but worth a comment.

**Concrete fix:** No change needed; add a code comment explaining the token order.

---

## Verified Assumptions

| Assumption | Verified |
|---|---|
| `generateMetadata` in `src/app/menu/[slug]/page.jsx` is already implemented and returns `openGraph.images` pointing to `absoluteUrl(/og/dishes/${slug}.jpg)` | ✓ Confirmed by reading the file |
| `twitter.card = "summary_large_image"` is set in existing metadata | ✓ Confirmed |
| `absoluteUrl()` from `src/lib/site.js` produces absolute URLs using `NEXT_PUBLIC_SITE_URL` | ✓ Confirmed |
| All 13 `toSlug(dish.name)` values are byte-identical to the corresponding OG JPEG basenames in `public/og/dishes/` | ✓ Confirmed by running the slug check script — all 13 returned OK |
| All 13 OG JPEG files exist in `public/og/dishes/` | ✓ Confirmed by directory listing |
| All 4 featured-dish card WebP files exist in `public/dishes/display/card/` (`doro-wat.webp`, `addis-double-smash.webp`, `crispy-chicken-burger.webp`, `ethiopian-coffee.webp`) | ✓ Confirmed by directory listing |
| `FilterShell.jsx` already uses `flex-col` on small screens and `sm:flex-row` for the search/sort bar | ✓ Confirmed |
| Search input in `FilterShell.jsx` uses `w-full` | ✓ Confirmed |
| `CheckoutForm.jsx` submit button uses `w-full py-3` | ✓ Confirmed |
| `CheckoutForm.jsx` inputs use `w-full` | ✓ Confirmed |
| `src/components/` does not exist | ✓ Confirmed — `Test-Path` returned False |
| Root layout uses `max-w-6xl` on `<main>` | ✓ Confirmed — `<main className="flex-1 p-8 max-w-6xl w-full mx-auto">` |
| `globals.css` uses Tailwind v4 `@theme inline` | ✓ Confirmed |
| `neutral-950` is white (`#ffffff`) | ✓ Confirmed from `globals.css` |

---

## Unverified / Wrong Assumptions

| Assumption in Design | Actual Finding |
|---|---|
| "neutral-100 is near-black" — design uses `text-neutral-100` for the hero headline as if it will be light-coloured on a dark background | WRONG: `neutral-100 = #17211b` (near-black). The hero background `bg-neutral-200 = #2e3a32` (dark green). Black text on dark green is unreadable. (Finding 1) |
| "hover:bg-amber-300 produces a lighter amber hover" on CTA buttons | WRONG: `amber-300` and `amber-400` both map to `#15803d` in this theme — hover produces no visible change. (Finding 2) |
| "`getDishes()` is a synchronous array return" | WRONG: `getDishes` is declared `async function getDishes()` in `src/lib/dishes.js`. It returns a Promise. The landing page must `await` it. (Finding 3) |
| "The design uses the same class names already in the codebase — the custom overrides are transparent to Tailwind class usage" | PARTIALLY WRONG: The colour names are the same but the values are dramatically different (amber = green, neutral scale is inverted). The design's colour choices for the hero rely on wrong assumptions about what the colours look like. (Findings 1 and 2) |
| "FilterShell already uses `flex-col` on small screens" (presented as the entire fix is sufficient) | INCOMPLETE: The sort/count row (`flex flex-wrap items-center justify-between`) is not addressed. On 320 px the sort label and count text will squeeze together. (Finding 10) |
| "`scrollbar-none` CSS class added to `globals.css`" works as a Tailwind utility | WRONG for Tailwind v4: Must use `@utility scrollbar-none { ... }` syntax to be usable as a responsive Tailwind class. (Finding 9) |

---

## Verdict

- HIGH findings: 3 (findings 1, 2, 3)
- MEDIUM findings: 6 (findings 5, 6, 7, 8, 9, 10)
- NIT findings: 4 (findings 11, 12, 13, 14)

**CHANGES_REQUESTED**

The three HIGH findings (unreadable hero text due to colour misunderstanding, broken hover states, and missing `await` on `getDishes()`) would produce either a broken UI or a runtime crash. These must be resolved before implementation.
