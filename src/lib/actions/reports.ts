"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserAndRenewSession } from "../auth/sessions";
import { Role } from "@/generated/prisma/enums";

export type ToolUsageReportRow = {
    userName: string;
    toolName: string;
    timesUsed: number;
    avgCheckoutLengthHours: number;
    lateReturns: number;
};

export type InventoryUsageReportRow = {
    itemName: string;
    totalUsed: number;
    eventCount: number;
    avgPerEvent: number;
};

async function checkReportAccess(): Promise<string | null> {
    const currentUser = await getCurrentUserAndRenewSession();

    if (!currentUser) {
        return "You must be logged in";
    }

    if (currentUser.role !== Role.SUPERVISOR && currentUser.role !== Role.MANAGER) {
        return "You do not have permission to view reports";
    }

    return null;
}

export async function generateToolUsageReport(
    startDate: Date,
    endDate: Date,
): Promise<{ error: string } | { rows: ToolUsageReportRow[] }> {
    const accessError = await checkReportAccess();

    if (accessError) {
        return { error: accessError };
    }

    if (endDate < startDate) {
        return { error: "End date must be after start date" };
    }

    //this findMany() function is designed to find all completed checkouts, and any checkout
    //that is still open AND has passed its dueAt date. It leaves out open checkouts
    //that have no yet become overdue.
    //the resulting array objects will include
    //the checkedOutAt, dueAt, and returnedAt values of the respective checkout record and
    //the names of the tool and user related to that checkout record.
    const checkouts = await prisma.checkout.findMany({
        where: {
            checkedOutAt: { gte: startDate, lte: endDate },
            OR: [
                { returnedAt: { not: null } },
                { returnedAt: null, dueAt: { lt: new Date() } },
            ],
        },
        select: {
            checkedOutAt: true,
            dueAt: true,
            returnedAt: true,
            tool: { select: { name: true } },
            user: { select: { name: true} },
        },
    });

    const grouped = new Map<
        string,
        { userName: string; toolName: string; timesUsed: number; totalHours: number; completedCount: number; lateReturns: number }
    >();

    for (const checkout of checkouts) {
        const key = `${checkout.user.name}|${checkout.tool.name}`;
        const existing = grouped.get(key) ?? {
            userName: checkout.user.name,
            toolName: checkout.tool.name,
            timesUsed: 0,
            totalHours: 0,
            completedCount: 0,
            lateReturns: 0,
        };

        existing.timesUsed += 1;

        if (checkout.returnedAt) {
            const hours = (checkout.returnedAt.getTime() - checkout.checkedOutAt.getTime()) / (1000 * 60 * 60);
            existing.totalHours += hours;
            existing.completedCount += 1;
            if (checkout.returnedAt > checkout.dueAt) {
                existing.lateReturns += 1;
            }
        } else {
            existing.lateReturns += 1;
        }

        grouped.set(key, existing);
    }

    const rows: ToolUsageReportRow[] = Array.from(grouped.values()).map((row) => ({
        userName: row.userName,
        toolName: row.toolName,
        timesUsed: row.timesUsed,
        avgCheckoutLengthHours: row.completedCount === 0 ? 0 : Math.round((row.totalHours / row.completedCount) * 10) /10,
        lateReturns: row.lateReturns,
    }))
    .sort((a, b) => a.userName.localeCompare(b.userName) || a.toolName.localeCompare(b.toolName));

    return { rows };
}

export async function generateInventoryUsageReport(
    startDate: Date,
    endDate: Date,
): Promise<{error: string} | { rows: InventoryUsageReportRow[] }> {
    const accessError = await checkReportAccess();

    if (accessError) {
        return { error: accessError };
    }

    if (endDate < startDate) {
        return { error: "End date must be after start date" };
    }

    const adjustments = await prisma.inventoryAdjustment.findMany({
        where: {
            createdAt: { gte: startDate, lte: endDate },
            changeAmount: { lt: 0 },
        },
        select: {
            changeAmount: true,
            item: { select: { name: true } },
        },
    });

    const grouped = new Map<string, { itemName: string; totalUsed: number; eventCount: number }>();

    for (const adjustment of adjustments) {
        const key = adjustment.item.name;
        const existing = grouped.get(key) ?? { itemName: adjustment.item.name, totalUsed: 0, eventCount: 0 };

        existing.totalUsed += Math.abs(adjustment.changeAmount);
        existing.eventCount += 1;

        grouped.set(key, existing);
    }

    const rows: InventoryUsageReportRow[] = Array.from(grouped.values()).map((row) => ({
        itemName: row.itemName,
        totalUsed: row.totalUsed,
        eventCount: row.eventCount,
        avgPerEvent: Math.round((row.totalUsed / row.eventCount) * 10) / 10,
    }))
    .sort((a, b) => a.itemName.localeCompare(b.itemName));

    return { rows };
}