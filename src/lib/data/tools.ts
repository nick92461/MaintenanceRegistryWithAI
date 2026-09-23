import { prisma } from "@/lib/prisma";

export async function getActiveTools() {
    return prisma.tool.findMany({
        where: { deletedAt: null },
        select: { name: true, category: true, location: true },
        orderBy: { name: "asc" }, 
    });
}