import { prisma } from "@/lib/prisma";

export async function isRateLimited(key: string, limit: number, windowMs: number): Promise<boolean> {
    const since = new Date(Date.now() - windowMs);
    const hits = await prisma.rateLimitHit.count({ where: { key, createdAt: { gte: since } } });

    return hits >= limit;
}

export async function recordRateLimitHit(key: string, windowMs: number): Promise<void> {
    await prisma.rateLimitHit.create({ data: { key } });

    await prisma.rateLimitHit.deleteMany({ where: { key, createdAt: { lt: new Date(Date.now() - windowMs) } } });
}