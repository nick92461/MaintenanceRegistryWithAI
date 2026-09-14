"use client";

import { useState } from "react";
import { ToolStatus } from "@/generated/prisma/enums";
import ToolActionButton from "@/components/tools/ToolActionButton";
import DeleteToolButton from "@/components/tools/DeleteToolButton";

export type ToolListItem = {
    id: string;
    name: string;
    category: string;
    location: string;
    status: ToolStatus;
    statusLabel: string;
    isCheckedOut: boolean;
    isOverDue: boolean;
    dueAt: Date | null;
};

export default function ToolsList({ tools, canManage }: { tools: ToolListItem[]; canManage: boolean }) {
    const [search, setSearch] = useState("");

    const query = search.trim().toLowerCase();
    const filteredTools = 
        query === ""
            ? tools
            : tools.filter(
                (tool) =>
                    tool.name.toLowerCase().includes(query) ||
                    tool.category.toLowerCase().includes(query) ||
                    tool.location.toLowerCase().includes(query) ||
                    tool.statusLabel.toLowerCase().includes(query),
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

            {tools.length === 0 && <p className="text-gray-500">No tools yet</p>}

            {tools.length > 0 && filteredTools.length === 0 && (
                <p className="text-gray-500">No tools match your search.</p>
            )}

            <ul className="flex flex-col gap-2">
                {filteredTools.map((tool) => (
                    <li
                        key={tool.id}
                        className={
                            tool.isCheckedOut
                                ? "flex items-center justify-between rounded border bg-gray-100 p-3 opacity-60"
                                : "flex items-center justify-between rounded border p-3"
                        }
                    >
                        <div>
                            <p className="font-medium">{tool.name}</p>
                            <p className="text-sm text-gray-500">{tool.category} - {tool.location}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {tool.isCheckedOut && tool.dueAt && (
                                <span className="rounded bg-gray-500 px-2 py-1 text-xs font-semibold text-white">
                                    Due {tool.dueAt.toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                                </span>
                            )}
                            {tool.isOverDue && (
                                <span className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white">
                                    Overdue
                                </span>
                            )}
                            <span className="text-sm text-gray-500">{tool.statusLabel}</span>
                            <ToolActionButton toolId={tool.id} status={tool.status} />
                            {canManage && <DeleteToolButton toolId={tool.id} />}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}