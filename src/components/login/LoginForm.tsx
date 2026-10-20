"use client";

import { useActionState } from "react";
import { login, type AuthActionState } from "@/lib/actions/auth";

import Link from "next/link";

const initialState: AuthActionState = {};


export default function LoginForm({ showSignup = true }: { showSignup?: boolean }) {
    const [state, formAction, isPending] = useActionState(login, initialState);

    return (
        <form action={formAction} className="flex w-full flex-col gap-4">
            <h1 className="text-xl font-bold">Sign in</h1>

            <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" required placeholder="you@company.com" className="input" />
            </div>

            <div className="field">
                <label htmlFor="password">Password</label>
                <input id="password" name="password" type="password" required className="input" />
            </div>

            {state.error && (
                <p className="text-sm text-red-600">{state.error}</p>
            )}

            <button
                type="submit"
                disabled={isPending}
                className="btn btn-dark"
            >
                {isPending ? "Signing in..." : "Sign in"}
            </button>
            {showSignup && (
                <Link
                    href="/signup"
                    className="text-center text-sm font-medium text-accent hover:underline"
                >
                    Create an account
                </Link>
            )}
        </form>
    );
}
