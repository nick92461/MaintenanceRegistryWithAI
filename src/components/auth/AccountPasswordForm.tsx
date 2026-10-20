"use client";

import { useActionState } from "react";
import { changeOwnPassword, type AuthActionState } from "@/lib/actions/auth";

const initialState: AuthActionState = {};

export default function AccountPasswordForm() {
    const [state, formAction, isPending] = useActionState(changeOwnPassword, initialState);

    return (
        <form action={formAction} className="card flex w-full max-w-md flex-col gap-4 p-6">
            <h2 className="text-base font-semibold">Change password</h2>

            <div className="field">
                <label htmlFor="currentPassword">Current password</label>
                <input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    required
                    autoComplete="current-password"
                    className="input"
                />
            </div>

            <div className="field">
                <label htmlFor="newPassword">New password</label>
                <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    required
                    autoComplete="new-password"
                    className="input"
                />
            </div>

            <div className="field">
                <label htmlFor="confirmPassword">Confirm new password</label>
                <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    autoComplete="new-password"
                    className="input"
                />
            </div>

            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
            {state.success && (<p className="text-sm text-green-700">Password changed. You&apos;ve been signed out everywhere else.</p>)}

            <button
                type="submit"
                disabled={isPending}
                className="btn btn-primary self-start"
            >
                {isPending ? "Saving..." : "Change password" }
            </button>
        </form>
    );
}
