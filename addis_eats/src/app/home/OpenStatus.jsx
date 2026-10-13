"use client";

import { useEffect, useState } from "react";
import { CLOSES_AT_HOUR, OPENS_AT_HOUR, TIME_ZONE } from "@/lib/hours";

/**
 * Current time at the restaurant as a fractional hour (e.g. 14.5 = 14:30).
 * The kitchen's clock is what decides whether we are open — not the visitor's,
 * who may be in another timezone entirely.
 */
function readKitchenClock() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");

  return hour + minute / 60;
}

function describeHours() {
  const now = readKitchenClock();
  const open = now >= OPENS_AT_HOUR && now < CLOSES_AT_HOUR;

  if (open) {
    return { open: true, label: `Open now · until ${CLOSES_AT_HOUR}:00` };
  }

  if (now < OPENS_AT_HOUR) {
    return { open: false, label: `Closed · opens ${OPENS_AT_HOUR}:00` };
  }

  return { open: false, label: `Closed · opens tomorrow ${OPENS_AT_HOUR}:00` };
}

/**
 * Live open/closed pill for the landing page hero.
 *
 * Rendered on the server as a neutral "Kitchen hours" placeholder and filled in
 * after mount: the answer depends on the visitor's current time, so gating on
 * mount keeps the server HTML and the first client render identical (no
 * hydration mismatch), then re-checks every minute for long-lived tabs.
 */
export default function OpenStatus() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const update = () => setStatus(describeHours());

    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, []);

  const tone = !status
    ? "border-neutral-700 text-neutral-400"
    : status.open
      ? "border-emerald-500/70 text-emerald-500"
      : "border-neutral-700 text-neutral-500";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border bg-neutral-900/60 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] ${tone}`}
      aria-live="polite"
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${status?.open ? "bg-emerald-500" : "bg-neutral-500"}`}
      />
      {status ? status.label : "Kitchen hours"}
    </span>
  );
}
