"use client";

import { useActionState } from "react";
import { createInventoryItem } from "@/lib/actions/inventory";

type ActionState = { error?: string; success?: boolean };

const initialState: ActionState = {};

export default function AddItemForm({ propertyId }: { propertyId: string }) {
    const [state, formAction, isPending] = useActionState(createInventoryItem, initialState);

    return (
        <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="propertyId" value={propertyId} />

            <div className="grid gap-4 sm:grid-cols-3">
                <div className="field">
                    <label htmlFor="name">Name</label>
                    <input id="name" name="name" type="text" required className="input" />
                </div>

                <div className="field">
                    <label htmlFor="category">Category</label>
                    <input id="category" name="category" type="text" required className="input" />
                </div>

                <div className="field">
                    <label htmlFor="location">Location</label>
                    <input id="location" name="location" type="text" required className="input" />
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <div className="field">
                    <label htmlFor="quantity">Starting Quantity</label>
                    <input id="quantity" name="quantity" type="number" min="0" required className="input" />
                </div>

                <div className="field">
                    <label htmlFor="reorderThreshold">Reorder Threshold</label>
                    <input id="reorderThreshold" name="reorderThreshold" type="number" min="0" required className="input" />
                </div>
            </div>

            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
            {state.success && <p className="text-sm text-green-700">Item added.</p>}

            <button type="submit" disabled={isPending} className="btn btn-primary self-start">
                {isPending ? "Adding..." : "Add Item"}
            </button>
        </form>
    );
}
