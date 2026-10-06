"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession } from "../auth/sessions";
import { getClientAddress } from "../auth/clientAddress";
import { isRateLimited, recordRateLimitHit } from "../auth/rateLimit";
import { countActiveDemos, createDemoCompany, purgeExpiredDemos, type DemoCompanyResult } from "../demo/demoCompany";
import { DEMO_START_LIMIT, DEMO_START_WINDOW_MS, getMaxActiveDemos, isDemoMode } from "../demo/demoMode";
import type { AuthActionState } from "./auth";

export async function startDemo(): Promise<AuthActionState> {
    if (!isDemoMode()) {
        return { error: "The demo isn't available here." };
    }

    const attemptKey = `demo-start:${await getClientAddress()}`;

    if (await isRateLimited(attemptKey, DEMO_START_LIMIT, DEMO_START_WINDOW_MS)) {
        return { error: "You've started a lot of demos. Please try again later." };
    }

    let sandbox: DemoCompanyResult;

    try {
        await purgeExpiredDemos(prisma);

        if ((await countActiveDemos(prisma)) >= getMaxActiveDemos()) {
            return { error: "The demo is busy right now. Please try again in a little while." };
        }

        await recordRateLimitHit(attemptKey, DEMO_START_WINDOW_MS);
        sandbox = await createDemoCompany(prisma);
    } catch (error) {
        console.error(error);

        return { error: "Couldn't start the demo. Please try again." };
    }

    await createSession(sandbox.adminUserId);

    redirect("/dashboard");
}