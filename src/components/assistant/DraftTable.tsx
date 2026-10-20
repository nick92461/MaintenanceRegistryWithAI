"use client";

import type { Draft } from "@/lib/ai/drafts";
import type { DraftEdit } from "./useAssistantChat";
import { CheckIcon, CloseIcon } from "@/components/layout/icons";

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
        return (
            <section aria-label="Draft records" className="card flex min-h-[260px] flex-col items-center justify-center gap-1.5 p-8 text-center">
                <h2 className="text-base font-semibold">Draft records</h2>
                <p className="max-w-xs text-sm text-muted">
                    Describe your stock in the chat and the records will show up here for you to review before anything is saved.
                </p>
            </section>
        );
    }

    return (
        <section aria-label="Draft records" className="card flex flex-col">
            <div className="border-b border-line px-5 py-4">
                <h2 className="text-base font-semibold">
                    Draft records <span className="font-mono font-medium text-muted">{drafts.length}</span>
                </h2>
                <p className="mt-0.5 text-[13px] text-muted">Not saved yet. Edit any field before confirming.</p>
            </div>

            <div className="flex flex-col gap-3 px-5 py-4">
                {drafts.map((draft) => (
                    <div key={draft.id} className="flex flex-col gap-2.5 rounded-xl border border-line p-3.5">
                        <div className="flex items-center justify-between">
                            <span className={draft.kind === "inventory" ? "badge badge-green" : "badge badge-blue"}>
                                {draft.kind === "inventory" ? "Supply" : "Tool"}
                            </span>
                            <button
                                type="button"
                                onClick={() => onRemove(draft.id)}
                                aria-label={`Remove ${draft.name} from the draft`}
                                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-canvas hover:text-red-700"
                            >
                                <CloseIcon className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="flex flex-wrap items-end gap-2.5">
                            <div className="flex min-w-[140px] flex-[2_1_160px] flex-col gap-1">
                                <label className="text-xs font-medium text-muted">Name</label>
                                <input
                                    value={draft.name}
                                    onChange={(e) => onEdit(draft.id, { name: e.target.value })}
                                    className="input min-h-10 text-sm"
                                />
                            </div>

                            <div className="flex min-w-[120px] flex-[1_1_120px] flex-col gap-1">
                                <label className="text-xs font-medium text-muted">Category</label>
                                <input
                                    value={draft.category}
                                    onChange={(e) => onEdit(draft.id, { category: e.target.value })}
                                    className="input min-h-10 text-sm"
                                />
                            </div>

                            <div className="flex min-w-[100px] flex-[1_1_100px] flex-col gap-1">
                                <label className="text-xs font-medium text-muted">Location</label>
                                <input
                                    value={draft.location}
                                    onChange={(e) => onEdit(draft.id, { location: e.target.value })}
                                    className="input min-h-10 text-sm"
                                />
                            </div>

                            {draft.kind === "inventory" && (
                                <>
                                    <div className="flex w-24 flex-col gap-1">
                                        <label className="text-xs font-medium text-muted">Quantity</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={draft.quantity}
                                            onChange={(e) => onEdit(draft.id, { quantity: Number(e.target.value) })}
                                            className="input min-h-10 font-mono text-sm"
                                        />
                                    </div>

                                    <div className="flex w-28 flex-col gap-1">
                                        <label className="text-xs font-medium text-muted">Reorder at</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={draft.reorderThreshold}
                                            onChange={(e) => onEdit(draft.id, { reorderThreshold: Number(e.target.value) })}
                                            className="input min-h-10 font-mono text-sm"
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        {confirmErrors[draft.id] && <p className="text-sm text-red-600">{confirmErrors[draft.id]}</p>}
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5">
                <span className="text-[13px] text-muted">Saving checks each record again before it&apos;s written.</span>
                <button
                    type="button"
                    onClick={onConfirm}
                    disabled={isPending}
                    className="btn btn-primary"
                >
                    <CheckIcon className="h-4 w-4" />
                    {isPending ? "Saving..." : `Confirm ${drafts.length} record${drafts.length === 1 ? "" : "s"}`}
                </button>
            </div>
        </section>
    );
}
