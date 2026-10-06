"use client";

import { useActionState } from "react";
import { changePassword, type AuthActionState } from "@/lib/actions/auth";

const initialState: AuthActionState = {};

export default function ChangePasswordForm() {
    const [state, formAction, isPending] = useActionState(changePassword, initialState);

    return (
        <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
            <h1 className="text-xl font-semibold">Choose a new password</h1>
            <p className="text-sm text-gray-500">
                You signed in with a temporary password. Pick your own to continue.
            </p>

            <div className="flex flex-col gap-1">
                <label htmlFor="newPassword">New password</label>
                <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    required
                    autoComplete="new-password"
                    className="rounded border px-3 py-2"
                />
            </div>

            <div className="flex flex-col gap-1">
                <label htmlFor="confirmPassword">Confirm new password</label>
                <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    autoComplete="new-password"
                    className="rounded border px-3 py-2"
                />
            </div>

            {state.error && <p className="text-sm text-red-600">{state.error}</p>}

            <button
                type="submit"
                disabled={isPending}
                className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
                {isPending ? "Saving..." : "Save password"}
            </button>
        </form>
    );
}