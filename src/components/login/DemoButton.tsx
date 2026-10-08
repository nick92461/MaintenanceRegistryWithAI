"use client";

import { useActionState } from "react";
import { startDemo } from "@/lib/actions/demo";
import { AuthActionState } from "@/lib/actions/auth";

const initialState: AuthActionState = {};

export default function DemoButton() {
    const [state, formAction, isPending] = useActionState(startDemo, initialState);

    return (
        <form action={formAction} className="flex w-full max-w-sm flex-col gap-2 rounded border p-4">
            <h2 className="font-semibold">See it in action</h2>
            <p className="text-sm text-gray-500">
                Opens a private demo with sample data that only you can see. No account needed, and it&apos;s deleted after a day.
            </p>

            {state.error && <p className="text-sm text-red-600">{state.error}</p>}

            <button
                type="submit"
                disabled={isPending}
                className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50"
            >
                {isPending ? "Setting up your demo..." : "Try the live demo"}
            </button>
        </form>
    );
}