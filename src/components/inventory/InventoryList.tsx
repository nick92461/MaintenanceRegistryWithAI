"use client";

import { useState } from "react";
import AdjustQuantityForm from "@/components/inventory/AdjustQuantityForm";
import DeleteItemButton from "@/components/inventory/DeleteItemButton";

export type InventoryListItem = {
    id: string;
    name: string;
    category: string;
    location: string;
    quantity: number;
    statusLabel: string;
    isLowStock: boolean;
}

export default function InventoryList({ items, canManage }: { items: InventoryListItem[]; canManage: boolean }) {
    const [search, setSearch] = useState("");

    const query = search.trim().toLowerCase();
    const filteredItems = 
        query === ""
            ? items
            : items.filter(
                (item) =>
                    item.name.toLowerCase().includes(query) ||
                    item.category.toLowerCase().includes(query) ||
                    item.location.toLowerCase().includes(query) ||
                    item.statusLabel.toLowerCase().includes(query),
            );

    return (
        <div className="flex flex-col gap-2">
            <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, category, location, or status"
                className="rounded border p-2 text-sm"
            />

            {items.length === 0 && <p className="text-gray-500">No inventory items yet.</p>}

            {items.length > 0 && filteredItems.length === 0 && (
                <p className="text-gray-500">No inventory items match your search.</p>
            )}

            <ul className="flex flex-col gap-2">
                {filteredItems.map((item) => (
                    <li
                        key={item.id}
                        className="flex items-center justify-between rounded border p-3"
                    >
                        <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-500">{item.category} - {item.location}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            {canManage && <DeleteItemButton itemId={item.id} />}
                            <div className="text-right">
                                <p className="font-medium">{item.quantity}</p>
                                <p className={item.isLowStock ? "text-sm text-red-600" : "text-sm text-gray-500"}>{item.statusLabel}</p>
                            </div>
                            <AdjustQuantityForm itemId={item.id} />
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    )
}