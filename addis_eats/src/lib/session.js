import { cookies } from "next/headers";
import {
    createSessionToken,
    SESSION_COOKIE,
    verifySessionToken,
} from "@/lib/session-token";

export { SESSION_COOKIE };

export function sanitizeNextPath(value) {
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

export async function getSession() {
    const cookieStore = await cookies();
    return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function setSession(session) {
    const cookieStore = await cookies();
    cookieStore.set({
        name: SESSION_COOKIE,
        value: await createSessionToken(session),
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
    });
}

export async function clearSession() {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
}

export async function requireSession(nextPath = "/signin") {
    const session = await getSession();
    if (!session) {
        const safeNext = sanitizeNextPath(nextPath);
        const destination = `/signin?next=${encodeURIComponent(safeNext)}`;
        return { session: null, redirectTo: destination };
    }

    return { session, redirectTo: null };
}
