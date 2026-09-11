"use client";

import { useState } from "react";
import { updateUserRole } from "@/lib/actions/users";
import { Role } from "@/generated/prisma/enums";

export default function ApproveButton({ userId }: { userId: string }) {
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleClick() {
        setIsPending(true);
        setError(null);
        const result = await updateUserRole(userId, Role.TECHNICIAN);

        if (result.error) {
            setError(result.error);
        }
        setIsPending(false);
    }

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                onClick={handleClick}
                disabled={isPending}
                className="rounded bg-green-600 px-3 py-1 text-sm text-white disabled:opacity-50"
            >
                {isPending ? "Approving..." : "Approve"}
            </button>
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    );
}