"use server";

import { prisma } from "@/lib/prisma";
import { requirePropertyRole } from "../auth/access";
import { LEAD_ROLES, STAFF_ROLES } from "../auth/propertyRole";
import { Tool } from "../domain/Tool";
import { revalidatePath } from "next/cache";

function getCheckoutDueDate(): Date {
    const due = new Date();
    due.setHours(17, 0, 0, 0);

    if (due.getTime() <= Date.now()) {
        due.setDate(due.getDate() + 1);
    }

    return due;
}

export async function createTool(prevState: unknown, formData: FormData) {
    const access = await requirePropertyRole(formData.get("propertyId"), LEAD_ROLES);

    if ("error" in access) {
        return { error: access.error };
    }

    const name = formData.get("name");
    const category = formData.get("category");
    const location = formData.get("location");

    if (typeof name !== "string" || typeof category !== "string" || typeof location !== "string") {
        return { error: "Missing required fields" };
    }

    if (name.trim().length === 0 || category.trim().length === 0 || location.trim().length === 0) {
        return { error: "Missing required fields" };
    }

    await prisma.tool.create({
        data: { propertyId: access.propertyId, name, category, location },
    });

    revalidatePath(`/p/${access.propertyId}/tools`);

    return { success: true };
}

export async function deleteTool(propertyId: string, toolId: string) {
    const access = await requirePropertyRole(propertyId, LEAD_ROLES);

    if ("error" in access) {
        return { error: access.error };
    }

    const row = await prisma.tool.findFirst({ where: { id: toolId, propertyId: access.propertyId } });

    if (!row) {
        return { error: "Tool not found" };
    }

    const tool = new Tool(
        row.id,
        row.name,
        row.category,
        row.location,
        row.status,
        row.deletedAt,
    );

    try {
        tool.delete();
    } catch (err) {
        return { error: err instanceof Error ? err.message : "Unable to delete tool" };
    }

    await prisma.tool.update({
        where: { id: toolId },
        data: { deletedAt: tool.getDeletedAt() },
    });

    revalidatePath(`/p/${access.propertyId}/tools`);

    return { success: true };
}

export async function checkOutTool(propertyId: string, toolId: string) {
    const access = await requirePropertyRole(propertyId, STAFF_ROLES);

    if ("error" in access) {
        return { error: access.error };
    }

    const row = await prisma.tool.findFirst({ where: { id: toolId, propertyId: access.propertyId } });

    if (!row) {
        return { error: "Tool not found" };
    }

    const tool = new Tool(
        row.id,
        row.name,
        row.category,
        row.location,
        row.status,
        row.deletedAt
    );

    try {
        tool.checkOut();
    } catch (err) {
        return { error: err instanceof Error ? err.message : "Unable to check out tool" };
    }

    await prisma.tool.update({
        where: { id: toolId },
        data: { status: tool.getStatus() },
    });

    await prisma.checkout.create({
        data: {
            propertyId: access.propertyId,
            toolId,
            userId: access.user.id,
            checkedOutAt: new Date(),
            dueAt: getCheckoutDueDate(),
        },
    });

    revalidatePath(`/p/${access.propertyId}/tools`);

    return { success: true };
}

export async function checkInTool(propertyId: string, toolId: string) {
    const access = await requirePropertyRole(propertyId, STAFF_ROLES);

    if ("error" in access) {
        return { error: access.error };
    }

    const row = await prisma.tool.findFirst ({
        where: { id: toolId, propertyId: access.propertyId },
    });

    if (!row) {
        return { error: "Tool not found" };
    }

    const openCheckout = await prisma.checkout.findFirst({
        where: {
            propertyId: access.propertyId,
            toolId,
            returnedAt: null,
        },
    });

    if (!openCheckout) {
        return { error: "This tool is not currently checked out" };
    }

    const tool = new Tool(
        row.id,
        row.name,
        row.category,
        row.location,
        row.status,
        row.deletedAt,
    );
    tool.checkIn();

    await prisma.tool.update({
        where: { id: toolId },
        data: { status: tool.getStatus() },
    });

    await prisma.checkout.update({
        where: { id: openCheckout.id },
        data: { returnedAt: new Date() },
    });

    revalidatePath(`/p/${access.propertyId}/tools`);

    return { success: true };
}