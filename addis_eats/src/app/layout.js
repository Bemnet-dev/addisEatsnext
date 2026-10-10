import Link from "next/link";
import { Geist } from "next/font/google";
import { signOut } from "@/app/actions";
import { getSession } from "@/lib/session";
import { absoluteUrl, SITE_URL } from "@/lib/site";
import Providers from "../lib/providers";
import ActionConsole from "./ActionConsole";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
          <header className="flex justify-between items-center px-8 py-4 border-b border-neutral-800">
            <Link
              href="/"
              prefetch={false}
              className="font-serif text-xl font-bold text-amber-400"
            >
              Addis Eats
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              <Link href="/menu" prefetch={false} className="hover:text-amber-400 transition-colors">
                Menu
              </Link>
              <Link href="/orders" prefetch={false} className="hover:text-amber-400 transition-colors">
                Orders
              </Link>
              <Link href="/cart" prefetch={false} className="hover:text-amber-400 transition-colors">
                Cart
              </Link>
              <Link href="/checkout" prefetch={false} className="hover:text-amber-400 transition-colors">
                Checkout
              </Link>

              {session ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-[0.18em] text-emerald-400">
                    {session.name} ({session.role})
                  </span>
                  {session.role === "staff" && (
                    <Link href="/kitchen" className="hover:text-amber-400 transition-colors">
                      Kitchen
                    </Link>
                  )}
                  <form action={signOut}>
                    <button
                      type="submit"
                      className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs font-medium transition hover:border-amber-400 hover:text-amber-300"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              ) : (
                <Link
                  href="/signin"
                  prefetch={false}
                  className="rounded-md border border-amber-400/80 px-3 py-1.5 text-xs font-medium text-amber-300 transition hover:bg-amber-400 hover:text-neutral-950"
                >
                  Sign in
                </Link>
              )}
            </nav>
          </header>

          <main className="flex-1 p-8 max-w-6xl w-full mx-auto">
            {children}
          </main>

          <footer className="px-8 py-6 border-t border-neutral-800 text-center text-xs text-neutral-500">
            © {new Date().getFullYear()} Addis Eats
          </footer>
        </Providers>
      </body>
    </html>
  );
}