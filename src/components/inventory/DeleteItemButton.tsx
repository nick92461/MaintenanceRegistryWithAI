"use client";

import { useState } from "react";
import { deleteInventoryItem } from "@/lib/actions/inventory";

export default function DeleteItemButton({ itemId }: { itemId: string;}) {
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleClick() {
        setIsPending(true);
        setError(null);

        const result = await deleteInventoryItem(itemId);

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
                className="rounded bg-blue-600 px-3 py-1 text-sm text-white disabled:opacity-50"
            >
                {isPending ? "Working..." : "Delete item" }
            </button>
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    );
}