import { prisma } from "@/lib/prisma";

export async function getActiveInventoryItems(propertyId: string) {
    return prisma.inventoryItem.findMany({
        where: { propertyId, deletedAt: null },
        select: { name: true, category: true, location: true, quantity: true, reorderThreshold: true },
        orderBy: { name: "asc" },
    });
}

