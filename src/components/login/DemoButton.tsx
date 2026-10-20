"use client";

import { useActionState } from "react";
import { startDemo } from "@/lib/actions/demo";
import { AuthActionState } from "@/lib/actions/auth";
import { ArrowIcon } from "@/components/layout/icons";

const initialState: AuthActionState = {};

export default function DemoButton() {
    const [state, formAction, isPending] = useActionState(startDemo, initialState);

    return (
        <form action={formAction} className="card flex w-full flex-col gap-3.5 p-6 shadow-[0_1px_2px_rgba(20,24,31,0.04),0_8px_24px_rgba(20,24,31,0.06)]">
            <div>
                <h2 className="text-lg font-semibold">See it in action</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    Opens a private demo with sample data that only you can see. No account needed, and it&apos;s deleted after a day.
                </p>
            </div>

            {state.error && <p className="text-sm text-red-600">{state.error}</p>}

            <button
                type="submit"
                disabled={isPending}
                className="btn btn-primary min-h-12 text-[15px]"
            >
                {isPending ? "Setting up your demo..." : "Try the live demo"}
                {!isPending && <ArrowIcon className="h-4 w-4" />}
            </button>

            <p className="text-xs leading-relaxed text-muted">
                The assistant is AI: what you type to it is processed by Anthropic&apos;s Claude API, and voice dictation uses your browser&apos;s speech service.
                Your IP address is kept for 24 hours to limit abuse. Please don&apos;t enter real personal or confidential information.
            </p>
        </form>
    );
}
