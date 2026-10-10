import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

/**
 * Root social preview card (1200x630) used by every route that does not
 * generate its own image. Dish pages generate a card with the price in
 * src/app/menu/[slug]/opengraph-image.js.
 *
 * Kept to satori-supported display values: "flex" | "block" | "contents" |
 * "none" | "-webkit-box" — "inline-flex" throws at runtime.
 */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #111827 0%, #1f2937 45%, #0f172a 100%)",
          color: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 26,
            letterSpacing: 6,
            color: "#fbbf24",
            textTransform: "uppercase",
          }}
        >
          <span>Addis Eats</span>
          <span>Addis Ababa · Ethiopian kitchen</span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              padding: "10px 18px",
              borderRadius: 999,
              background: "rgba(251, 191, 36, 0.14)",
              color: "#fbbf24",
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            Order online
          </div>
          <div style={{ fontSize: 78, lineHeight: 1.06, fontWeight: 800, maxWidth: 900 }}>
            Authentic Ethiopian food
          </div>
          <div style={{ fontSize: 34, color: "#d1d5db", maxWidth: 940 }}>
            Doro wat, kitfo, sambusa, pizza and fresh Ethiopian coffee — served fresh, delivered fast.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            borderTop: "1px solid rgba(255,255,255,0.2)",
            paddingTop: 28,
            fontSize: 30,
            color: "#e5e7eb",
          }}
        >
          <span>addiseatsnext.vercel.app</span>
          <span style={{ color: "#fbbf24", fontWeight: 700 }}>Browse the menu →</span>
        </div>
      </div>
    ),
    {
      width: size.width,
      height: size.height,
    }
  );
}
