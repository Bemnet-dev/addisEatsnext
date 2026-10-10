"use client";

import { useActionState } from "react";
import { signIn } from "@/app/actions";

export default function SignInForm({ nextPath = "/orders" }) {
    const [state, formAction, isPending] = useActionState(signIn, null);

    return (
        <div className="mx-auto max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/80 p-8 shadow-2xl shadow-black/20">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-amber-400">
                Sign in
            </p>
            <h1 className="font-serif text-4xl text-amber-300">Welcome back</h1>
            <p className="mt-3 text-sm text-neutral-400">
                Sign in with a customer or staff demo account.
            </p>

            <div className="mt-5 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-200">
                <span className="block">Customer: <span className="font-semibold">Abebe Kebede</span> / <span className="font-semibold">addis123</span></span>
                <span className="mt-1 block">Staff: <span className="font-semibold">Kitchen Staff</span> / <span className="font-semibold">kitchen123</span></span>
            </div>

            <form action={formAction} className="mt-6 space-y-4">
                <input type="hidden" name="next" value={nextPath} />

                <div>
                    <label htmlFor="customerName" className="mb-1 block text-sm text-neutral-300">
                        Full name
                    </label>
                    <input
                        id="customerName"
                        name="customerName"
                        type="text"
                        autoComplete="name"
                        className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none transition focus:border-amber-400"
                        placeholder="Abebe Kebede"
                    />
                    {state?.fieldErrors?.customerName && (
                        <p className="mt-1 text-xs text-red-400">{state.fieldErrors.customerName[0]}</p>
                    )}
                </div>

                <div>
                    <label htmlFor="password" className="mb-1 block text-sm text-neutral-300">
                        Password
                    </label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-100 outline-none transition focus:border-amber-400"
                        placeholder="••••••••"
                    />
                    {state?.fieldErrors?.password && (
                        <p className="mt-1 text-xs text-red-400">{state.fieldErrors.password[0]}</p>
                    )}
                </div>

                {state?.error && (
                    <p className="text-sm text-red-400">{state.error}</p>
                )}

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full rounded-md bg-amber-400 px-4 py-3 font-semibold text-neutral-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isPending ? "Signing in…" : "Sign in"}
                </button>
            </form>
        </div>
    );
}
