"use client";

import { useActionState } from "react";
import { createAccount, type AuthActionState } from "@/lib/actions/auth";

const initialState: AuthActionState = {};

export default function SignupForm() {
    const [state, formAction, isPending] = useActionState(createAccount, initialState);

    return (
        <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
            <h1 className="text-xl font-semibold">Create an account</h1>

            <div className="flex flex-col gap-1">
                <label htmlFor="name">Name</label>
                <input id="name" name="name" type="text" required className="rounded border px-3 py-2" />
            </div>

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
                {isPending ? "Creating account..." : "Sign up"}
            </button>

        </form>
    )
}