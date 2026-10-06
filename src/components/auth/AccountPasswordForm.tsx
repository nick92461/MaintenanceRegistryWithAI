"use client";

import { useActionState } from "react";
import { changeOwnPassword, type AuthActionState } from "@/lib/actions/auth";

const initialState: AuthActionState = {};

export default function AccountPasswordForm() {
    const [state, formAction, isPending] = useActionState(changeOwnPassword, initialState);

    return (
        <form action={formAction} className="flex w-full max-w-sm flex-col gap-4 rounded border p-4">
            <h2 className="font-semibold">Change password</h2>

            <div className="flex flex-col gap-1">
                <label htmlFor="currentPassword">Current password</label>
                <input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    required
                    autoComplete="current-password"
                    className="rounded border px-3 py-2"
                />
            </div>

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
            {state.success && (<p className="text-sm text-green-600">Password changed. You&apos;ve been signed out everywhere else.</p>)}

            <button
                type="submit"
                disabled={isPending}
                className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
                {isPending ? "Saving..." : "Change password" }
            </button>
        </form>
    );
}