import { prisma } from "../prisma";
import { Role, ToolStatus } from "@/generated/prisma/enums";

export type AttentionItem = {
    kind: "overdue" | "low-stock" | "pending";
    title: string;
    detail: string;
};

export type PropertySummary = {
    lowStock: number;
    overdueTools: number;
    checkedOut: number;
    totalTools: number;
    pendingApprovals: number;
    attention: AttentionItem[];
};

const MAX_ATTENTION_ITEMS = 6;

function describeOverdue(dueAt: Date, now: Date): string {
    const hours = Math.floor((now.getTime() - dueAt.getTime()) / (60 * 60 * 1000));

    if (hours < 1) {
        return "less than an hour";
    }

    if (hours < 48) {
        return `${hours} hour${hours === 1 ? "" : "s"}`;
    }

    return `${Math.floor(hours / 24)} days`;
}

// Everything the property home page shows, in one round of queries. Every query is scoped to the property.
export async function getPropertySummary(propertyId: string, includePending: boolean): Promise<PropertySummary> {
    const now = new Date();
    const lowStockWhere = {
        propertyId,
        deletedAt: null,
        quantity: { lte: prisma.inventoryItem.fields.reorderThreshold },
    };
    const overdueWhere = { propertyId, returnedAt: null, dueAt: { lt: now } };

    const [lowStock, lowItems, overdueTools, overdueRows, checkedOut, totalTools, pendingApprovals] = await Promise.all([
        prisma.inventoryItem.count({ where: lowStockWhere }),
        prisma.inventoryItem.findMany({
            where: lowStockWhere,
            select: { name: true, quantity: true, reorderThreshold: true, location: true },
            orderBy: { name: "asc" },
            take: MAX_ATTENTION_ITEMS,
        }),
        prisma.checkout.count({ where: overdueWhere }),
        prisma.checkout.findMany({
            where: overdueWhere,
            select: { dueAt: true, tool: { select: { name: true } }, user: { select: { name: true } } },
            orderBy: { dueAt: "asc" },
            take: MAX_ATTENTION_ITEMS,
        }),
        prisma.tool.count({ where: { propertyId, deletedAt: null, status: ToolStatus.CHECKED_OUT } }),
        prisma.tool.count({ where: { propertyId, deletedAt: null } }),
        includePending ? prisma.propertyMembership.count({ where: { propertyId, role: Role.GUEST } }) : Promise.resolve(0),
    ]);

    const attention: AttentionItem[] = [
        ...overdueRows.map((row): AttentionItem => ({
            kind: "overdue",
            title: row.tool.name,
            detail: `Overdue by ${describeOverdue(row.dueAt, now)}, checked out by ${row.user.name}`,
        })),
        ...lowItems.map((item): AttentionItem => ({
            kind: "low-stock",
            title: item.name,
            detail: `${item.quantity} left in ${item.location}, reorder at ${item.reorderThreshold}`,
        })),
    ];

    if (pendingApprovals > 0) {
        attention.push({
            kind: "pending",
            title: `${pendingApprovals} ${pendingApprovals === 1 ? "person wants" : "people want"} to join`,
            detail: "Approve them on the Users page",
        });
    }

    return {
        lowStock,
        overdueTools,
        checkedOut,
        totalTools,
        pendingApprovals,
        attention: attention.slice(0, MAX_ATTENTION_ITEMS),
    };
}
