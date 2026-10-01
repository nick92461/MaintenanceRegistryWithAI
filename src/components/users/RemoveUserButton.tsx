"use client";

import { useState } from "react";
import { removeUserFromCompany, removeUserFromProperty } from "@/lib/actions/users";

type RemoveScope = "property" | "company";

export default function RemoveUserButton({ propertyId, userId, scope }: { propertyId: string; userId: string; scope: RemoveScope; }) {
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleClick() {
        setIsPending(true);
        setError(null);

        const action = scope === "company" ? removeUserFromCompany : removeUserFromProperty;
        const result = await action(propertyId, userId);

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
                className="rounded bg-red-600 px-3 py-1 text-sm text-white disabled:opacity-50"
            >
                {isPending ? "Working..." : scope === "company" ? "Remove from company" : "Remove from property"}
            </button>
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    );
}