"use server";

import { prisma } from "@/lib/prisma";
import { requirePropertyRole } from "../auth/access";
import { LEAD_ROLES } from "../auth/propertyRole";
import { revalidatePath } from "next/cache";
import type { Draft } from "../ai/drafts";

export type ConfirmDraftsResult = 
    | { error: string }
    | { createdCount: number; failed: { draftId: string; reason: string }[] };

function validateDraft(draft: Draft): string | undefined {
    if (draft.name.trim().length === 0) return "Name is required.";
    if (draft.category.trim().length === 0) return "Category is required.";
    if (draft.location.trim().length === 0) return "Location is required.";

    if (draft.kind === "inventory") {
        if (!Number.isInteger(draft.quantity) || draft.quantity < 0) {
            return "Quantity must be a whole number 0 or greater.";
        }

        if (!Number.isInteger(draft.reorderThreshold) || draft.reorderThreshold < 0) {
            return "Reorder threshold must be a whole number 0 or greater.";
        }
    }

    return undefined;
}

export async function confirmDrafts(propertyId: string, drafts: Draft[]): Promise<ConfirmDraftsResult> {
    const access = await requirePropertyRole(propertyId, LEAD_ROLES);

    if ("error" in access) {
        return { error: access.error };
    }

    if (!Array.isArray(drafts) || drafts.length === 0) {
        return { error: "No drafts to confirm" };
    }

    const failed: { draftId: string; reason: string}[] = [];
    const valid: Draft[] = [];

    for (const draft of drafts) {
        const reason = validateDraft(draft);

        if (reason) {
            failed.push({ draftId: draft.id, reason });
        } else {
            valid.push(draft);
        }
    }

    if (valid.length === 0) {
        return { createdCount: 0, failed };
    }

    const inventoryDrafts = valid.filter((d): d is Extract<Draft, { kind: "inventory" }> => d.kind === "inventory");
    const toolDrafts = valid.filter((d): d is Extract<Draft, { kind: "tool" }> => d.kind === "tool");

    await prisma.$transaction(async (tx) => {
        if (inventoryDrafts.length > 0) {
            await tx.inventoryItem.createMany({
                data: inventoryDrafts.map((draft) => ({
                    propertyId: access.propertyId,
                    name: draft.name,
                    category: draft.category,
                    location: draft.location,
                    quantity: draft.quantity,
                    reorderThreshold: draft.reorderThreshold,
                })),
            });
        }

        if (toolDrafts.length > 0) {
            await tx.tool.createMany({
                data: toolDrafts.map((draft) => ({
                    propertyId: access.propertyId,
                    name: draft.name,
                    category: draft.category,
                    location: draft.location,
                })),
            });
        }
    });

    revalidatePath(`/p/${access.propertyId}/inventory`);
    revalidatePath(`/p/${access.propertyId}/tools`);

    return { createdCount: valid.length, failed };
}