"use client";

import { useState } from "react";
import { deleteTool } from "@/lib/actions/tools";

export default function DeleteToolButton({ propertyId, toolId }: { propertyId: string; toolId: string }) {
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleClick() {
        setIsPending(true);
        setError(null);

        const result = await deleteTool(propertyId, toolId);

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
                className="btn btn-sm btn-danger"
            >
                {isPending ? "Working..." : "Delete" }
            </button>
            {error && <p className="max-w-52 text-right text-xs text-red-600">{error}</p>}
        </div>
    );
}
