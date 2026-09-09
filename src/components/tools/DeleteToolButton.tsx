"use client";

import { useState } from "react";
import { deleteTool } from "@/lib/actions/tools";

export default function DeleteToolButton({ toolId }: { toolId: string;}) {
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleClick() {
        setIsPending(true);
        setError(null);

        await deleteTool(toolId);

        setIsPending(false);
    }

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                onClick={handleClick}
                disabled={isPending}
                className="rounded bg-blue-600 px-3 py-1 text-sm text-white disabled:opacity-50"
            >
                {isPending ? "Working..." : "Delete tool" }
            </button>
            
        </div>
    );
}