import { ImageResponse } from "next/og";
import { getDishes } from "@/lib/dishes";
import { toSlug } from "../slug";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image({ params }) {
  const { slug } = await params;
  const dishes = await getDishes();
  const dish = dishes.find((item) => toSlug(item.name) === slug);

  if (!dish) {
    return new Response("Dish not found", { status: 404 });
  }

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
            fontSize: 24,
            letterSpacing: 4,
            color: "#fbbf24",
            textTransform: "uppercase",
          }}
        >
          <span>Addis Eats</span>
          <span>{dish.category}</span>
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
              padding: "10px 18px",
              borderRadius: 999,
              background: "rgba(251, 191, 36, 0.14)",
              color: "#fbbf24",
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            Featured dish
          </div>
          <div style={{ fontSize: 72, lineHeight: 1.08, fontWeight: 800, maxWidth: 820 }}>
            {dish.name}
          </div>
          <div style={{ fontSize: 34, color: "#d1d5db", maxWidth: 920 }}>
            {dish.description}
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
          }}
        >
          <span>Fresh Ethiopian flavors</span>
          <span style={{ color: "#fbbf24", fontWeight: 700 }}>{dish.price} Birr</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
