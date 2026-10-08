import { prisma } from "@/lib/prisma";
import { isDemoMode } from "./demoMode";

export const DEMO_ROW_CAPS = {
    tools: 100,
    inventoryItems: 100,
    checkouts: 1000,
    adjustments: 2500,
} as const;

export type DemoRowKind = keyof typeof DEMO_ROW_CAPS;

const LABELS: Record<DemoRowKind, string> = {
    tools: "tools",
    inventoryItems: "inventory items",
    checkouts: "checkouts",
    adjustments: "quantity changes",
};

export const DEMO_MAX_TEXT_LENGTH = 100;
export const DEMO_MAX_NOTE_LENGTH = 200;
export const DEMO_TEXT_TOO_LONG = `In this demo, names, categories, and locations are limited to ${DEMO_MAX_TEXT_LENGTH} characters, and notes to ${DEMO_MAX_NOTE_LENGTH}.`;

export function hasOverlongDemoText(values: unknown[], limit: number = DEMO_MAX_TEXT_LENGTH): boolean {
    return isDemoMode() && values.some((value) => typeof value === "string" && value.length > limit);
}

function countRows(kind: DemoRowKind, companyId: string): Promise<number> {
    const where = { property: { companyId } };

    switch (kind) {
        case "tools":
            return prisma.tool.count({ where });
        case "inventoryItems":
            return prisma.inventoryItem.count({ where });
        case "checkouts":
            return prisma.checkout.count({ where });
        case "adjustments":
            return prisma.inventoryAdjustment.count({ where });
    }
}

export async function demoRowCapMessage(companyId: string, kind: DemoRowKind, adding = 1): Promise<string | null> {
    if (!isDemoMode()) {
        return null;
    }

    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { isDemo: true } });

    if (!company?.isDemo) {
        return null;
    }

    const cap = DEMO_ROW_CAPS[kind];

    if ((await countRows(kind, companyId)) + adding <= cap) {
        return null;
    }

    return `This private demo is limited to ${cap} ${LABELS[kind]}, so that can't be added.`;
}