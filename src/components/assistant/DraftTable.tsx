"use client";

import type { Draft } from "@/lib/ai/drafts";
import type { DraftEdit } from "./useAssistantChat";

type DraftTableProps = {
    drafts: Draft[];
    confirmErrors: Record<string, string>;
    isPending: boolean;
    onEdit: (id: string, changes: DraftEdit) => void;
    onRemove: (id: string) => void;
    onConfirm: () => void;
};

export default function DraftTable({ drafts, confirmErrors, isPending, onEdit, onRemove, onConfirm }: DraftTableProps) {
    if (drafts.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-3 rounded border p-4">
            <h2 className="font-semibold">Draft records ({drafts.length})</h2>

            <div className="flex flex-col gap-2">
                {drafts.map((draft) => (
                    <div key={draft.id} className="flex flex-col gap-2 rounded border p-3">
                        <div className="flex flex-wrap items-end gap-2">
                            <div className="flex min-w-[140px] flex-1 flex-col gap-1">
                                <label className="text-xs text-gray-500">Name</label>
                                <input
                                    value={draft.name}
                                    onChange={(e) => onEdit(draft.id, { name: e.target.value })}
                                    className="rounded border px-2 py-1"
                                />
                            </div>

                            <div className="flex min-w-[120px] flex-1 flex-col gap-1">
                                <label className="text-xs text-gray-500">Category</label>
                                <input
                                    value={draft.category}
                                    onChange={(e) => onEdit(draft.id, { category: e.target.value })}
                                    className="rounded border px-2 py-1"
                                />
                            </div>

                            <div className="flex min-w-[120px] flex-1 flex-col gap-1">
                                <label className="text-xs text-gray-500">Location</label>
                                <input 
                                    value={draft.location}
                                    onChange={(e) => onEdit(draft.id, { location: e.target.value })}
                                    className="rounded border px-2 py-1"
                                />
                            </div>

                            {draft.kind === "inventory" && (
                                <>
                                    <div className="flex w-24 flex-col gap-1">
                                        <label className="text-xs text-gray-500">Quantity</label>
                                        <input 
                                            type="number"
                                            min="0"
                                            value={draft.quantity}
                                            onChange={(e) => onEdit(draft.id, { quantity: Number(e.target.value) })}
                                            className="rounded border px-2 py-1"
                                        />
                                    </div>

                                    <div className="flex w-28 flex-col gap-1">
                                        <label className="text-xs text-gray-500">Reorder at</label>
                                        <input 
                                            type="number"
                                            min="0"
                                            value={draft.reorderThreshold}
                                            onChange={(e) => onEdit(draft.id, { reorderThreshold: Number(e.target.value) })}
                                            className="rounded border px-2 py-1"
                                        />
                                    </div>
                                </>
                            )}

                            <button
                                type="button"
                                onClick={() => onRemove(draft.id)}
                                className="rounded border px-3 py-1 text-sm text-red-600"
                            >
                                Remove
                            </button>
                        </div>

                        {confirmErrors[draft.id] && <p className="text-sm text-red-600">{confirmErrors[draft.id]}</p>}
                    </div>
                ))}
            </div>

            <button
                type="button"
                onClick={onConfirm}
                disabled={isPending}
                className="self-start rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
                {isPending ? "Saving..." : `Confirm ${drafts.length} record${drafts.length === 1 ? "" : "s"}`}
            </button>
        </div>
    );
}