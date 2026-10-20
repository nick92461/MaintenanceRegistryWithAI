"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createAccount, type AuthActionState } from "@/lib/actions/auth";

const initialState: AuthActionState = {};

export default function SignupForm() {
    const [state, formAction, isPending] = useActionState(createAccount, initialState);

    return (
        <form action={formAction} className="card flex w-full max-w-sm flex-col gap-4 p-6">
            <h1 className="text-xl font-bold">Create an account</h1>

            <div className="field">
                <label htmlFor="joinCode">Property join code</label>
                <input
                    id="joinCode"
                    name="joinCode"
                    type="text"
                    required
                    autoCapitalize="characters"
                    autoComplete="off"
                    className="input uppercase"
                />
                <p className="text-xs font-normal text-muted">Ask your property manager for this code.</p>
            </div>

            <div className="field">
                <label htmlFor="name">Name</label>
                <input id="name" name="name" type="text" required className="input" />
            </div>

            <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" required className="input" />
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
                className="btn btn-primary"
            >
                {isPending ? "Creating account..." : "Sign up"}
            </button>

            <Link href="/login" className="text-center text-sm font-medium text-accent hover:underline">
                Back to sign in
            </Link>
        </form>
    )
}
