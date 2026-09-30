import { prisma } from "@/lib/prisma";

export async function getActiveTools(propertyId: string) {
    return prisma.tool.findMany({
        where: { propertyId, deletedAt: null },
        select: { name: true, category: true, location: true },
        orderBy: { name: "asc" }, 
    });
}