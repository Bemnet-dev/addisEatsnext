import { ImageResponse } from "next/og";
import { photoDataUri } from "@/lib/og-photo";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export const alt = "Addis Eats — authentic Ethiopian cuisine";

/**
 * Root social preview card (1200x630) used by every route that does not
 * generate its own image (/, /menu, /cart …). Dish pages generate their own
 * card with the dish photo and price in src/app/menu/[slug]/opengraph-image.js.
 *
 * The photo is the JPEG produced by `npm run og:images`: Satori cannot decode
 * WebP, so embedding the dish photo directly makes the route throw.
 *
 * Kept to satori-supported display values: "flex" | "block" | "contents" |
 * "none" | "-webkit-box" — "inline-flex" throws at runtime.
 *
 * `photo` may be null (asset unreadable); the card then renders without the
 * image panel rather than failing.
 */
export default async function Image() {
  const photo = await photoDataUri("/og/site.jpg");

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #111827 0%, #1f2937 45%, #0f172a 100%)",
          color: "#f8fafc",
          fontFamily: "sans-serif",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "56px 48px 56px 64px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 24,
              letterSpacing: 5,
              color: "#fbbf24",
              textTransform: "uppercase",
            }}
          >
            <span>Addis Eats</span>
            <span>Ethiopian kitchen</span>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                padding: "8px 18px",
                borderRadius: 999,
                background: "rgba(251, 191, 36, 0.14)",
                color: "#fbbf24",
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              Order online
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 64,
                lineHeight: 1.06,
                fontWeight: 800,
                maxWidth: 620,
              }}
            >
              Authentic Ethiopian food
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 28,
                lineHeight: 1.35,
                color: "#d1d5db",
                maxWidth: 620,
              }}
            >
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
              paddingTop: 24,
              fontSize: 26,
              color: "#e5e7eb",
            }}
          >
            <span>addiseatsnext.vercel.app</span>
            <span style={{ color: "#fbbf24", fontWeight: 700 }}>Browse the menu →</span>
          </div>
        </div>

        {photo && (
          // Satori cannot render next/image, and the photo is decorative
          // (the card's meaning is in the text, exposed via og:image:alt).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt=""
            width={430}
            height={630}
            style={{
              width: 430,
              height: 630,
              objectFit: "cover",
            }}
          />
        )}
      </div>
    ),
    {
      width: size.width,
      height: size.height,
    }
  );
}
