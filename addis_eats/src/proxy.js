import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session-token";

function sanitizeNextPath(value) {
    if (typeof value !== "string") return "/";

    const next = value.trim();
    if (
        !next ||
        !next.startsWith("/") ||
        next.startsWith("//") ||
        next.includes("\\") ||
        /[\u0000-\u001f]/.test(next)
    ) {
        return "/";
    }

    return next;
}

function isPrivateRoute(pathname) {
    return pathname === "/checkout" || pathname.startsWith("/checkout/") ||
        pathname === "/orders" || pathname.startsWith("/orders/");
}

export async function proxy(request) {
    const { pathname, search } = request.nextUrl;
    const session = await verifySessionToken(
        request.cookies.get(SESSION_COOKIE)?.value
    );

    if (pathname === "/signin" && session) {
        const next = sanitizeNextPath(request.nextUrl.searchParams.get("next"));
        const target = next === "/" ? "/orders" : next;
        return NextResponse.redirect(new URL(target, request.url));
    }

    if (!session && isPrivateRoute(pathname)) {
        const next = sanitizeNextPath(`${pathname}${search}`);
        const url = new URL("/signin", request.url);
        url.searchParams.set("next", next);
        return NextResponse.redirect(url);
    }

    if (pathname === "/kitchen" || pathname.startsWith("/kitchen/")) {
        if (!session) {
            const url = new URL("/signin", request.url);
            url.searchParams.set("next", sanitizeNextPath(`${pathname}${search}`));
            return NextResponse.redirect(url);
        }
        if (session.role !== "staff") {
            return NextResponse.redirect(new URL("/orders", request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/signin", "/checkout/:path*", "/orders/:path*", "/kitchen/:path*"],
};
