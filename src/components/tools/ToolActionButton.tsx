"use client";

import { useState } from "react";
import { checkOutTool, checkInTool } from "@/lib/actions/tools";
import { ToolStatus } from "@/generated/prisma/enums";

export default function ToolActionButton({ toolId, status}: { toolId: string; status: ToolStatus}) {
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleClick() {
        setIsPending(true);
        setError(null);

        const action = status === ToolStatus.CHECKED_OUT ? checkInTool : checkOutTool;
        const result = await action(toolId);
        
        if (result.error) {
            setError(result.error);
        }

        setIsPending(false);
    }

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                onClick={handleClick}
                disabled={isPending || status === ToolStatus.MAINTENANCE}
                className="rounded bg-blue-600 px-3 py-1 text-sm text-white disabled:opacity-50"
            >
                {isPending ? "Working..." : status === ToolStatus.CHECKED_OUT ? "Check In" : "Check Out"}
            </button>
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    );
}