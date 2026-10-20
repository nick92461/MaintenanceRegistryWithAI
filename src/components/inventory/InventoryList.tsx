"use client";

import { useState } from "react";
import AdjustQuantityForm from "@/components/inventory/AdjustQuantityForm";
import DeleteItemButton from "@/components/inventory/DeleteItemButton";
import { SearchIcon } from "@/components/layout/icons";

export type InventoryListItem = {
    id: string;
    name: string;
    category: string;
    location: string;
    quantity: number;
    reorderThreshold: number;
    statusLabel: string;
    isLowStock: boolean;
}

type Filter = "all" | "low";

const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "low", label: "Low stock" },
];

// How full the bar looks: three times the reorder level counts as a full shelf.
function stockPercent(item: InventoryListItem): number {
    const full = Math.max(item.reorderThreshold, 1) * 3;

    return Math.max(4, Math.min(100, Math.round((item.quantity / full) * 100)));
}

export default function InventoryList({ propertyId, items, canManage }: { propertyId: string; items: InventoryListItem[]; canManage: boolean }) {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<Filter>("all");

    const query = search.trim().toLowerCase();
    const filteredItems = items.filter(
        (item) =>
            (filter === "all" || item.isLowStock) &&
            (query === "" ||
                item.name.toLowerCase().includes(query) ||
                item.category.toLowerCase().includes(query) ||
                item.location.toLowerCase().includes(query) ||
                item.statusLabel.toLowerCase().includes(query)),
    );

    return (
        <div className="flex min-h-screen flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div role="group" aria-label="Filter by stock" className="flex flex-wrap gap-2">
                    {FILTERS.map(({ key, label }) => {
                        const active = filter === key;
                        const count = key === "all" ? items.length : items.filter((item) => item.isLowStock).length;

                        return (
                            <button
                                key={key}
                                type="button"
                                aria-pressed={active}
                                onClick={() => setFilter(key)}
                                className={`min-h-10 cursor-pointer rounded-full border px-3.5 text-[13px] transition-colors ${
                                    active ? "border-ink bg-ink font-semibold text-white" : "border-line-strong bg-white font-medium text-ink hover:bg-canvas"
                                }`}
                            >
                                {label} <span className={`font-mono ${active ? "opacity-70" : "text-muted"}`}>{count}</span>
                            </button>
                        );
                    })}
                </div>

                <label className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-line-strong bg-white px-3 sm:w-80">
                    <SearchIcon className="h-4 w-4 text-muted" />
                    <input
                        type="search"
                        aria-label="Search inventory"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, category, location, or status"
                        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted/70"
                    />
                </label>
            </div>

            {items.length === 0 && <p className="text-muted">No inventory items yet.</p>}

            {items.length > 0 && filteredItems.length === 0 && <p className="text-muted">No inventory items match your search.</p>}

            {filteredItems.length > 0 && (
                <div className="card overflow-x-auto">
                    <table className="w-full min-w-[860px] border-collapse text-sm">
                        <thead>
                            <tr className="text-left text-xs uppercase tracking-wide text-muted">
                                <th className="border-b border-line px-5 py-3.5 font-semibold">Item</th>
                                <th className="border-b border-line px-3 py-3.5 font-semibold">Location</th>
                                <th className="w-52 border-b border-line px-3 py-3.5 font-semibold">On hand</th>
                                <th className="border-b border-line px-3 py-3.5 font-semibold">Status</th>
                                <th className="border-b border-line px-5 py-3.5 text-right font-semibold">Adjust</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map((item) => (
                                <tr key={item.id}>
                                    <td className="border-b border-line px-5 py-3.5">
                                        <div className="font-semibold">{item.name}</div>
                                        <div className="text-[13px] text-muted">{item.category}</div>
                                    </td>
                                    <td className="border-b border-line px-3 py-3.5 text-[#39414D]">{item.location}</td>
                                    <td className="border-b border-line px-3 py-3.5">
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-mono text-base font-semibold">{item.quantity}</span>
                                            <span className="text-xs text-muted">reorder at {item.reorderThreshold}</span>
                                        </div>
                                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
                                            <div
                                                className={`h-full rounded-full ${item.isLowStock ? "bg-red-600" : "bg-green-700"}`}
                                                style={{ width: `${stockPercent(item)}%` }}
                                            />
                                        </div>
                                    </td>
                                    <td className="border-b border-line px-3 py-3.5">
                                        <span className={item.isLowStock ? "badge badge-red" : "badge badge-green"}>{item.statusLabel}</span>
                                    </td>
                                    <td className="border-b border-line px-5 py-3.5">
                                        <div className="flex items-start justify-end gap-2">
                                            <AdjustQuantityForm propertyId={propertyId} itemId={item.id} />
                                            {canManage && <DeleteItemButton propertyId={propertyId} itemId={item.id} />}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
