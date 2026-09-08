"use client";

import { useActionState } from "react";
import { createInventoryItem } from "@/lib/actions/inventory";

type ActionState = { error?: string; success?: boolean };

const initialState: ActionState = {};

export default function AddItemForm() {
    const [state, formAction, isPending] = useActionState(createInventoryItem, initialState);

    return (
        <form action={formAction} className="flex flex-col gap-3 rounded border p-4">
            <h2 className="font-semibold">Add Inventory Item</h2>

            <div className="flex flex-col gap-1">
                <label htmlFor="name">Name</label>
                <input id="name" name="name" type="text" required className="rounded border px-3 py-2" />
            </div>

            <div className="flex flex-col gap-1">
                <label htmlFor="category">Category</label>
                <input id="category" name="category" type="text" required className="rounded border px-3 py-2" />
            </div>

            <div className="flex flex-col gap-1">
                <label htmlFor="location">Location</label>
                <input id="location" name="location" type="text" required className="rounded border px-3 py-2" />
            </div>

            <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1">
                    <label htmlFor="quantity">Starting Quantity</label>
                    <input id="quantity" name="quantity" type="number" min="0" required className="rounded border px-3 py-2" />
                </div>

                <div className="flex flex-1 flex-col gap-1">
                    <label htmlFor="reorderThreshold">Reorder Threshold</label>
                    <input id="reorderThreshold" name="reorderThreshold" type="number" min="0" required className="rounded border px-3 py-2" />
                </div>
            </div>

            {state.error && <p className="text-sm text-red-600">{state.error}</p>}

            <button type="submit" disabled={isPending} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
                {isPending ? "Adding..." : "Add Item"}
            </button>
        </form>
    );
}

