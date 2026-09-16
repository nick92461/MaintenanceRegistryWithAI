"use client";

import { useActionState } from "react";
import { login, type AuthActionState } from "@/lib/actions/auth";

import Link from "next/link";

const initialState: AuthActionState = {};


export default function LoginForm() {
    const [state, formAction, isPending] = useActionState(login, initialState);

    return (
        <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
            <h1 className="text-xl font-semibold">Login</h1>

            <div className="flex flex-col gap-1">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" required className="rounded border px-3 py-2" />
            </div>

            <div className="flex flex-col gap-1">
                <label htmlFor="password">Password</label>
                <input id="password" name="password" type="password" required className="rounded border px-3 py-2" />
            </div>

            {state.error && (
                <p className="text-sm text-red-600">{state.error}</p>
            )}

            <button
                type="submit"
                disabled={isPending}
                className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
                {isPending ? "Signing in..." : "Sign in"}
            </button>
            <Link
                href="/signup"
                className="text-center text-sm text-blue-600 underline"
            >
                Create an account
            </Link>
        </form>
    )
}