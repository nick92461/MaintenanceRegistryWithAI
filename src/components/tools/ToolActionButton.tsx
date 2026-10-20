"use client";

import { useState } from "react";
import { checkOutTool, checkInTool } from "@/lib/actions/tools";
import { ToolStatus } from "@/generated/prisma/enums";

export default function ToolActionButton({ propertyId, toolId, status }: { propertyId: string; toolId: string; status: ToolStatus }) {
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleClick() {
        setIsPending(true);
        setError(null);

        const action = status === ToolStatus.CHECKED_OUT ? checkInTool : checkOutTool;
        const result = await action(propertyId, toolId);

        if (result.error) {
            setError(result.error);
        }

        setIsPending(false);
    }

    const isOut = status === ToolStatus.CHECKED_OUT;

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                onClick={handleClick}
                disabled={isPending || status === ToolStatus.MAINTENANCE}
                className={`btn btn-sm min-w-[104px] ${isOut ? "btn-secondary" : "btn-dark"}`}
            >
                {isPending ? "Working..." : status === ToolStatus.MAINTENANCE ? "Unavailable" : isOut ? "Check in" : "Check out"}
            </button>
            {error && <p className="max-w-52 text-right text-xs text-red-600">{error}</p>}
        </div>
    );
}
