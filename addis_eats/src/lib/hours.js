/**
 * Single source of truth for kitchen hours.
 *
 * Used in two places that must never drift apart:
 *   - `src/app/page.js` — the Restaurant JSON-LD `openingHoursSpecification`
 *   - `src/app/home/OpenStatus.jsx` — the live open/closed pill in the hero
 *
 * Times are the restaurant's own (Addis Ababa), not the visitor's.
 */
export const TIME_ZONE = "Africa/Addis_Ababa";
export const OPENS_AT_HOUR = 8;
export const CLOSES_AT_HOUR = 22;
