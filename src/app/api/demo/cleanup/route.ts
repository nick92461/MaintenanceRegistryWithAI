import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthorizedCronRequest } from "@/lib/demo/cronAuth";
import { purgeExpiredDemos } from "@/lib/demo/demoCompany";
import { isDemoMode } from "@/lib/demo/demoMode";

const BATCH_SIZE = 25;
const TIME_BUDGET_MS = 8000;

export async function GET(request: NextRequest) {
    if (!isDemoMode()) {
        return new Response("Not found", { status: 404 });
    }

    if (!isAuthorizedCronRequest(request.headers.get("authorization"), process.env.CRON_SECRET)) {
        return new Response("Unauthorized", { status: 401 });
    }

    const startedAt = Date.now();
    let purged = 0;

    while (Date.now() - startedAt < TIME_BUDGET_MS) {
        const batch = await purgeExpiredDemos(prisma, new Date(), BATCH_SIZE);

        purged += batch;

        if (batch < BATCH_SIZE) {
            break;
        }
    }

    return Response.json({ purged });
}