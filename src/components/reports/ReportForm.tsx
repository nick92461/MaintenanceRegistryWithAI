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

export default function ReportForm({ propertyId }: { propertyId: string }) {
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
            const response = await generateToolUsageReport(propertyId, startDate, endDate);

            if ("error" in response) {
                setError(response.error);
            } else {
                setResult({ type: "TOOLS", rows: response.rows, startDate, endDate, generatedAt: new Date() });
            }
        } else {
            const response = await generateInventoryUsageReport(propertyId, startDate, endDate);

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
            <form onSubmit={handleSubmit} className="card flex max-w-2xl flex-col gap-4 p-5">
                <div className="field">
                    <label>Report</label>
                    <select
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value as ReportType)}
                        className="input"
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
                                ? "btn btn-sm btn-dark"
                                : "btn btn-sm btn-secondary"
                        }
                    >
                        Select A Month
                    </button>
                    <button
                        type="button"
                        onClick={() => setTimeframeMode("custom")}
                        className={
                            timeframeMode === "custom"
                                ? "btn btn-sm btn-dark"
                                : "btn btn-sm btn-secondary"
                        }
                    >
                        Custom Range
                    </button>
                </div>

                {timeframeMode === "month" ? (
                    <div className="field">
                        <label>Month</label>
                        <input
                            type="month"
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            className="input"
                        />
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-3">
                        <div className="field">
                            <label>Start date</label>
                            <input
                                type="date"
                                value={startDateInput}
                                onChange={(e) => setStartDateInput(e.target.value)}
                                className="input"
                            />
                        </div>
                        <div className="field">
                            <label>End date</label>
                            <input
                                type="date"
                                value={endDateInput}
                                onChange={(e) => setEndDateInput(e.target.value)}
                                className="input"
                            />
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isPending}
                    className="btn btn-primary self-start"
                >
                    {isPending ? "Generating report..." : "Generate Report"}
                </button>

                {error && <p className="text-sm text-red-600">{error}</p>}
            </form>

            {result && (
                <div className="flex flex-col gap-3">
                    <div>
                        <h2 className="text-lg font-semibold">
                            {result.type === "TOOLS" ? "Tool Usage Report" : "Inventory Usage Report"}
                        </h2>
                        <p className="text-sm text-muted">
                            {result.startDate.toLocaleDateString()} - {result.endDate.toLocaleDateString()} · Generated{" "}
                            {result.generatedAt.toLocaleString()}
                        </p>
                    </div>

                    <div className="card overflow-x-auto">
                        {result.type === "TOOLS" ? (
                            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                                <thead>
                                    <tr className="border-b border-line bg-canvas text-xs uppercase tracking-wide text-muted">
                                        <th className="px-4 py-3 font-semibold">User</th>
                                        <th className="px-4 py-3 font-semibold">Tool</th>
                                        <th className="px-4 py-3 font-semibold">Times Used</th>
                                        <th className="px-4 py-3 font-semibold">Avg. Checkout Length (hrs)</th>
                                        <th className="px-4 py-3 font-semibold">Late Returns</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.rows.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-6 text-center text-muted">
                                                No data for this period.
                                            </td>
                                        </tr>
                                    )}
                                    {result.rows.map((row) => (
                                        <tr key={`${row.userName}|${row.toolName}`} className="border-b border-line last:border-0">
                                            <td className="px-4 py-3">{row.userName}</td>
                                            <td className="px-4 py-3">{row.toolName}</td>
                                            <td className="px-4 py-3">{row.timesUsed}</td>
                                            <td className="px-4 py-3">{row.avgCheckoutLengthHours}</td>
                                            <td className="px-4 py-3">{row.lateReturns}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                                <thead>
                                    <tr className="border-b border-line bg-canvas text-xs uppercase tracking-wide text-muted">
                                        <th className="px-4 py-3 font-semibold">Item</th>
                                        <th className="px-4 py-3 font-semibold">Total Used</th>
                                        <th className="px-4 py-3 font-semibold"># of Withdrawals</th>
                                        <th className="px-4 py-3 font-semibold">Avg Quantity Withdrawn</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.rows.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-6 text-center text-muted">
                                                No data for this period.
                                            </td>
                                        </tr>
                                    )}
                                    {result.rows.map((row) => (
                                        <tr key={row.itemName} className="border-b border-line last:border-0">
                                            <td className="px-4 py-3">{row.itemName}</td>
                                            <td className="px-4 py-3">{row.totalUsed}</td>
                                            <td className="px-4 py-3">{row.eventCount}</td>
                                            <td className="px-4 py-3">{row.avgPerEvent}</td>
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
