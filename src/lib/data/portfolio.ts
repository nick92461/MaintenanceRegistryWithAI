import { prisma } from "../prisma";
import { Role } from "@/generated/prisma/enums";

export type PropertyCounts = {
    lowStock: number;
    overdueTools: number;
    pendingApprovals: number;
};

export async function getPropertyCounts(propertyIds: string[]): Promise<Map<string, PropertyCounts>> {
    const [lowStock, overdue, pending] = await Promise.all([
        prisma.inventoryItem.groupBy({
            by: ["propertyId"],
            where: {
                propertyId: { in: propertyIds },
                deletedAt: null,
                quantity: { lte: prisma.inventoryItem.fields.reorderThreshold },
            },
            _count: { _all: true },
        }),
        prisma.checkout.groupBy({
            by: ["propertyId"],
            where: { propertyId: { in: propertyIds }, returnedAt: null, dueAt: { lt: new Date() } },
            _count: { _all: true },
        }),
        prisma.propertyMembership.groupBy({
            by: ["propertyId"],
            where: { propertyId: { in: propertyIds }, role: Role.GUEST },
            _count: { _all: true },
        }),
    ]);

    const counts = new Map<string, PropertyCounts>();

    for (const id of propertyIds) {
        counts.set(id, { lowStock: 0, overdueTools: 0, pendingApprovals: 0 });
    }

    for (const row of lowStock) counts.get(row.propertyId)!.lowStock = row._count._all;
    for (const row of overdue) counts.get(row.propertyId)!.overdueTools = row._count._all;
    for (const row of pending) counts.get(row.propertyId)!.pendingApprovals = row._count._all;

    return counts;
}