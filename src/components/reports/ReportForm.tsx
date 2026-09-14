"use client";

import { useState } from "react";
import {
    generateToolUsageReport,
    generateInventoryUsageReport,
    type ToolUsageReportRow,
    type InventoryUsageReportRow,
} from "@/lib/actions/reports";

type ReportType = "TOOLS" | "INVENTORY";
type TimeframeMode = "month" | "custom";

type ReportResult =
    | { type: "TOOLS"; rows: ToolUsageReportRow[]; startDate: Date; endDate: Date; generatedAt: Date }
    | { type: "INVENTORY"; rows: InventoryUsageReportRow[]; startDate: Date; endDate: Date; generatedAt: Date };

function getMonthRange(month: string): { startDate: Date; endDate: Date } {
    const [yearStr, monthStr] = month.split("-");
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1;

    const startDate = new Date(year, monthIndex, 1, 0, 0, 0, 0);
    const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);

    return { startDate, endDate };
}

function getCustomRange(startDateInput: string, endDateInput: string): { startDate: Date; endDate: Date } {
    const startDate = new Date(`${startDateInput}T00:00:00`);
    const endDate = new Date(`${endDateInput}T23:59:59.999`);

    return { startDate, endDate };
}

export default function ReportForm() {
    const [reportType, setReportType] = useState<ReportType>("TOOLS");
	const [timeframeMode, setTimeframeMode] = useState<TimeframeMode>("month");
	const [month, setMonth] = useState("");
	const [startDateInput, setStartDateInput] = useState("");
	const [endDateInput, setEndDateInput] = useState("");
	const [isPending, setIsPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<ReportResult | null>(null);

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);

        if (timeframeMode === "month" && !month) {
            setError("Please select a month");
            return;
        }

        if (timeframeMode === "custom" && (!startDateInput || !endDateInput)) {
            setError("Please select a start and end date");
            return;
        }

        const { startDate, endDate } = timeframeMode === "month" ? getMonthRange(month) : getCustomRange(startDateInput, endDateInput);

        setIsPending(true);

        if (reportType === "TOOLS") {
            const response = await generateToolUsageReport(startDate, endDate);

            if ("error" in response) {
                setError(response.error);
            } else {
                setResult({ type: "TOOLS", rows: response.rows, startDate, endDate, generatedAt: new Date() });
            }
        } else {
            const response = await generateInventoryUsageReport(startDate, endDate);
            
            if ("error" in response) {
                setError(response.error);
            } else {
                setResult({ type: "INVENTORY", rows: response.rows, startDate, endDate, generatedAt: new Date() });
            }
        }

        setIsPending(false);
    }

    return (
        <div className="flex flex-col gap-4">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded border p-4">
                <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">Report</label>
                    <select
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value as ReportType)}
                        className="rounded border p-2"
                    >
                        <option value="TOOLS">Tool Usage Report</option>
                        <option value="INVENTORY">Inventory Usage Report</option>
                    </select>
                </div>

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setTimeframeMode("month")}
                        className={
                            timeframeMode === "month"
                            ? "rounded bg-blue-600 px-3 py-1 text-sm text-white"
                            : "rounded border px-3 py-1 text-sm"
                        }
                    >
                        Select A Month
                    </button>
                    <button
                        type="button"
                        onClick={() => setTimeframeMode("custom")}
                        className={
                            timeframeMode === "custom"
                            ? "rounded bg-blue-600 px-3 py-1 text-sm text-white"
                            : "rounded border px-3 py-1 text-sm"
                        }
                    >
                        Custom Range
                    </button>
                </div>

                {timeframeMode === "month" ? (
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium">Month</label>
                        <input
                            type="month"
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            className="rounded border p-2 text-sm"
                        />
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium">Start date</label>
                            <input
                                type="date"
                                value={startDateInput}
                                onChange={(e) => setStartDateInput(e.target.value)}
                                className="rounded border p-2 text-sm"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium">End date</label>
                            <input
                                type="date"
                                value={endDateInput}
                                onChange={(e) => setEndDateInput(e.target.value)}
                                className="rounded border py-2 text-sm"
                            />
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isPending}
                    className="rounded bg-blue-600 px-3 py-1 text-sm text-white disabled:opacity-50"
                >
                    {isPending ? "Generating report..." : "Generate Report"}
                </button>

                {error && <p className="text-sm text-red-600">{error}</p>}
            </form>

            {result && (
                <div className="flex flex-col gap-2">
                    <div>
                        <h2 className="text-lg font-semibold">
                            {result.type === "TOOLS" ? "Tool Usage Report" : "Inventory Usage Report"}
                        </h2>
                        <p className="text-sm text-gray-500">
                            {result.startDate.toLocaleDateString()} - {result.endDate.toLocaleDateString()} · Generated{" "}
                            {result.generatedAt.toLocaleString()}
                        </p>
                    </div>

                    <div className="overflow-x-auto rounded border">
                        {result.type === "TOOLS" ? (
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b bg-gray-50">
                                        <th className="p-3 font-medium">User</th>
                                        <th className="p-3 font-medium">Tool</th>
                                        <th className="p-3 font-medium">Times Used</th>
                                        <th className="p-3 font-medium">Avg. Checkout Length (hrs)</th>
                                        <th className="p-3 font-medium">Late Returns</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.rows.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-3 text-gray-500">
                                                No data for this period.
                                            </td>
                                        </tr>
                                    )}
                                    {result.rows.map((row) => (
                                        <tr key={`${row.userName}|${row.toolName}`} className="border-b last:border-0">
                                            <td className="p-3">{row.userName}</td>
                                            <td className="p-3">{row.toolName}</td>
                                            <td className="p-3">{row.timesUsed}</td>
                                            <td className="p-3">{row.avgCheckoutLengthHours}</td>
                                            <td className="p-3">{row.lateReturns}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b bg-gray-50">
                                        <th className="p-3 font-medium">Item</th>
                                        <th className="p-3 font-medium">Total Used</th>
                                        <th className="p-3 font-medium"># of Withdrawals</th>
                                        <th className="p-3 font-medium">Avg Quantity Withdrawn</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.rows.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-3 text-gray-500">
                                                No data for this period.
                                            </td>
                                        </tr>
                                    )}
                                    {result.rows.map((row) => (
                                        <tr key={row.itemName} className="border-b last:border-0">
                                            <td className="p-3">{row.itemName}</td>
                                            <td className="p-3">{row.totalUsed}</td>
                                            <td className="p-3">{row.eventCount}</td>
                                            <td className="p-3">{row.avgPerEvent}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
