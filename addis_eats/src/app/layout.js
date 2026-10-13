import { Geist } from "next/font/google";
import { getSession } from "@/lib/session";
import { absoluteUrl, SITE_URL } from "@/lib/site";
import Providers from "../lib/providers";
import ActionConsole from "./ActionConsole";
import SiteHeader from "./SiteHeader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  // `swap` paints the fallback font immediately and swaps in Geist once it
  // loads, so text (the LCP element on text-only pages like /cart and /signin)
  // renders without waiting on the font — no invisible-text delay.
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "Addis Eats",
  title: {
    default: "Addis Eats",
    template: "%s | Addis Eats",
  },
  description: "Authentic Ethiopian cuisine, handcrafted dishes, and a modern dining experience.",
  keywords: [
    "Addis Eats",
    "Ethiopian restaurant",
    "Ethiopian food",
    "Addis Ababa dining",
    "family meals",
  ],
  openGraph: {
    title: "Addis Eats",
    description: "Authentic Ethiopian cuisine, handcrafted dishes, and a modern dining experience.",
    siteName: "Addis Eats",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: absoluteUrl("/opengraph-image"),
        width: 1200,
        height: 630,
        alt: "Addis Eats — authentic Ethiopian cuisine",
      },
    ],
    url: absoluteUrl("/"),
  },
  twitter: {
    card: "summary_large_image",
    title: "Addis Eats",
    description: "Authentic Ethiopian cuisine, handcrafted dishes, and a modern dining experience.",
    images: [absoluteUrl("/opengraph-image")],
  },
};

export default async function RootLayout({ children }) {
  const session = await getSession();

  return (
    <html lang="en">
      <body className={`${geistSans.variable} min-h-screen flex flex-col bg-neutral-950 text-neutral-100`}>
        <ActionConsole />
        <Providers>
          <SiteHeader session={session} />

          <main className="flex-1 w-full mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            {children}
          </main>

          <footer className="px-4 py-6 border-t border-neutral-800 text-center text-xs text-neutral-500 sm:px-6 lg:px-8">
            © {new Date().getFullYear()} Addis Eats
          </footer>
        </Providers>
      </body>
    </html>
  );
}