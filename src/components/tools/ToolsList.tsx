"use client";

import { useState } from "react";
import { ToolStatus } from "@/generated/prisma/enums";
import ToolActionButton from "@/components/tools/ToolActionButton";
import DeleteToolButton from "@/components/tools/DeleteToolButton";
import { SearchIcon } from "@/components/layout/icons";

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
    checkedOutBy: string | null;
};

type Filter = "all" | "available" | "out" | "overdue";

const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "available", label: "Available" },
    { key: "out", label: "Checked out" },
    { key: "overdue", label: "Overdue" },
];

function matchesFilter(tool: ToolListItem, filter: Filter): boolean {
    switch (filter) {
        case "available":
            return tool.status === ToolStatus.AVAILABLE;
        case "out":
            return tool.isCheckedOut;
        case "overdue":
            return tool.isOverDue;
        default:
            return true;
    }
}

function badgeFor(tool: ToolListItem): { label: string; className: string } {
    if (tool.isOverDue) {
        return { label: "Overdue", className: "badge badge-amber" };
    }

    if (tool.isCheckedOut) {
        return { label: "Checked out", className: "badge badge-blue" };
    }

    if (tool.status === ToolStatus.MAINTENANCE) {
        return { label: "In repair", className: "badge badge-slate" };
    }

    return { label: "Available", className: "badge badge-green" };
}

export default function ToolsList({ propertyId, tools, canManage }: { propertyId: string; tools: ToolListItem[]; canManage: boolean }) {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<Filter>("all");

    const query = search.trim().toLowerCase();
    const filteredTools = tools.filter(
        (tool) =>
            matchesFilter(tool, filter) &&
            (query === "" ||
                tool.name.toLowerCase().includes(query) ||
                tool.category.toLowerCase().includes(query) ||
                tool.location.toLowerCase().includes(query) ||
                tool.statusLabel.toLowerCase().includes(query)),
    );

    return (
        <div className="flex min-h-screen flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
                    {FILTERS.map(({ key, label }) => {
                        const active = filter === key;

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
                                {label}{" "}
                                <span className={`font-mono ${active ? "opacity-70" : "text-muted"}`}>
                                    {tools.filter((tool) => matchesFilter(tool, key)).length}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <label className="flex min-h-11 w-full items-center gap-2 rounded-xl border border-line-strong bg-white px-3 sm:w-80">
                    <SearchIcon className="h-4 w-4 text-muted" />
                    <input
                        type="search"
                        aria-label="Search tools"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, category, location, or status"
                        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted/70"
                    />
                </label>
            </div>

            {tools.length === 0 && <p className="text-muted">No tools yet.</p>}

            {tools.length > 0 && filteredTools.length === 0 && <p className="text-muted">No tools match your search.</p>}

            {filteredTools.length > 0 && (
                <div className="card overflow-x-auto">
                    <table className="w-full min-w-[760px] border-collapse text-sm">
                        <thead>
                            <tr className="text-left text-xs uppercase tracking-wide text-muted">
                                <th className="border-b border-line px-5 py-3.5 font-semibold">Tool</th>
                                <th className="border-b border-line px-3 py-3.5 font-semibold">Location</th>
                                <th className="border-b border-line px-3 py-3.5 font-semibold">Status</th>
                                <th className="border-b border-line px-3 py-3.5 font-semibold">Due back</th>
                                <th className="border-b border-line px-5 py-3.5 text-right font-semibold">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTools.map((tool) => {
                                const badge = badgeFor(tool);

                                return (
                                    <tr key={tool.id} className={tool.isOverDue ? "bg-amber-50" : tool.isCheckedOut ? "bg-canvas/60" : ""}>
                                        <td className="border-b border-line px-5 py-3.5">
                                            <div className="font-semibold">{tool.name}</div>
                                            <div className="text-[13px] text-muted">{tool.category}</div>
                                        </td>
                                        <td className="border-b border-line px-3 py-3.5 text-[#39414D]">{tool.location}</td>
                                        <td className="border-b border-line px-3 py-3.5">
                                            <span className={badge.className}>{badge.label}</span>
                                        </td>
                                        <td className="border-b border-line px-3 py-3.5 text-[#39414D]">
                                            {tool.isCheckedOut && tool.dueAt ? (
                                                <>
                                                    <div>{tool.dueAt.toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</div>
                                                    {tool.checkedOutBy && <div className="text-[13px] text-muted">with {tool.checkedOutBy}</div>}
                                                </>
                                            ) : (
                                                <span className="text-muted">-</span>
                                            )}
                                        </td>
                                        <td className="border-b border-line px-5 py-3.5">
                                            <div className="flex items-start justify-end gap-2">
                                                <ToolActionButton propertyId={propertyId} toolId={tool.id} status={tool.status} />
                                                {canManage && <DeleteToolButton propertyId={propertyId} toolId={tool.id} />}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
