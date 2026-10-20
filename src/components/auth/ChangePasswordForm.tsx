"use client";

import { useActionState } from "react";
import { changePassword, type AuthActionState } from "@/lib/actions/auth";

const initialState: AuthActionState = {};

export default function ChangePasswordForm() {
    const [state, formAction, isPending] = useActionState(changePassword, initialState);

    return (
        <form action={formAction} className="card flex w-full max-w-sm flex-col gap-4 p-6">
            <h1 className="text-xl font-bold">Choose a new password</h1>
            <p className="text-sm text-muted">
                You signed in with a temporary password. Pick your own to continue.
            </p>

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

            <button
                type="submit"
                disabled={isPending}
                className="btn btn-primary"
            >
                {isPending ? "Saving..." : "Save password"}
            </button>
        </form>
    );
}
