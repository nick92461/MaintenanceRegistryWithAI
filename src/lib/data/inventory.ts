import { prisma } from "@/lib/prisma";

export async function getActiveInventoryItems() {
    return prisma.inventoryItem.findMany({
        where: { deletedAt: null },
        select: { name: true, category: true, location: true, quantity: true, reorderThreshold: true },
        orderBy: { name: "asc" },
    });
}

