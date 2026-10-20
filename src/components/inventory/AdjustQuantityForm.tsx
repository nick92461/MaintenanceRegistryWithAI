"use client";

import { useState } from "react";
import { adjustInventoryQuantity } from "@/lib/actions/inventory";

export default function AdjustQuantityForm({ propertyId, itemId }: { propertyId: string; itemId: string }) {
    const [amount, setAmount] = useState("1");
    const [note, setNote] = useState("");
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // direction is -1 to remove stock and +1 to add it; the amount field is always a plain positive number.
    async function apply(direction: 1 | -1) {
        const amountNumber = Number(amount);

        if (!Number.isInteger(amountNumber) || amountNumber <= 0) {
            setError("Enter a whole number greater than 0");
            return;
        }

        setIsPending(true);
        setError(null);

        const result = await adjustInventoryQuantity(propertyId, itemId, direction * amountNumber, note || undefined);

        if (result.error) {
            setError(result.error);
        } else {
            setAmount("1");
            setNote("");
        }

        setIsPending(false);
    }

    return (
        <form onSubmit={(e) => e.preventDefault()} className="flex w-44 flex-col gap-1.5">
            <div className="flex items-center justify-end gap-1.5">
                <button
                    type="button"
                    aria-label="Remove quantity"
                    disabled={isPending}
                    onClick={() => apply(-1)}
                    className="btn btn-secondary btn-sm w-10 px-0 text-lg leading-none"
                >
                    −
                </button>
                <input
                    type="number"
                    min="1"
                    aria-label="Amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input min-h-10 w-14 px-1 text-center font-mono text-sm"
                />
                <button
                    type="button"
                    aria-label="Add quantity"
                    disabled={isPending}
                    onClick={() => apply(1)}
                    className="btn btn-secondary btn-sm w-10 px-0 text-lg leading-none"
                >
                    +
                </button>
            </div>
            <input
                type="text"
                aria-label="Note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note (optional)"
                className="input min-h-9 px-2 text-xs"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
        </form>
    );
}
