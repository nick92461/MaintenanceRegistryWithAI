"use client";

import { useState } from "react";
import { deleteUser } from "@/lib/actions/users";

export default function DeleteUserButton({ userId }: { userId: string;}) {
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleClick() {
        setIsPending(true);
        setError(null);

        const deletionResult = await deleteUser(userId);

        if (deletionResult.error) {
            setError(deletionResult.error);
        }

        setIsPending(false);
    }

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                onClick={handleClick}
                disabled={isPending}
                className="rounded bg-red-600 px-3 py-1 text-sm text-white disabled:opacity-50"
            >
                {isPending ? "Working..." : "Remove user" }
            </button>
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    );
}