"use client";

import { useState } from "react";
import { adjustInventoryQuantity } from "@/lib/actions/inventory";

export default function AdjustQuantityForm({ itemId }: { itemId: string }) {
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();

        const amountNumber = Number(amount);

        if (!Number.isInteger(amountNumber) || amountNumber === 0) {
            setError("Enter a whole number greater than 0");
            return;
        }

        setIsPending(true);
        setError(null);

        const result = await adjustInventoryQuantity(itemId, amountNumber, note || undefined);

        if (result.error) {
            setError(result.error);
        } else {
            setAmount("");
            setNote("");
        }

        setIsPending(false);
    }

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="+/- amount"
                className="w-24 rounded border px-2 py-1 text-sm"
            />
            <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note (optional)"
                className="w-32 rounded border px-2 py-1 text-sm"
            />
            <button
                type="submit"
                disabled={isPending}
                className="rounded bg-gray-700 px-3 py-1 text-sm text-white disabled:opacity-50"
            >
                {isPending ? "..." : "Apply"}
            </button>
            {error && <p className="text-xs text-red-600">{error}</p>}
        </form>
    );
}