"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserAndRenewSession } from "../auth/sessions";
import { Role } from "@/generated/prisma/enums";
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
    const currentUser = await getCurrentUserAndRenewSession();

    if (!currentUser) {
        return { error: "You must be logged in" };
    }

    if (currentUser.role !== Role.SUPERVISOR && currentUser.role !== Role.MANAGER) {
        return { error: "You do not have permission to add tools" };
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
        data: { name, category, location },
    });

    revalidatePath("/tools");

    return { success: true };
}

export async function deleteTool(toolId: string) {
    const currentUser = await getCurrentUserAndRenewSession();

    if (!currentUser) {
        return { error: "You must be logged in" };
    }

    if (currentUser.role !== Role.SUPERVISOR && currentUser.role !== Role.MANAGER) {
        return { error: "You do not have permission to do that" };
    }

    const row = await prisma.tool.findUnique({ where: { id: toolId } });

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

    revalidatePath("/tools");

    return { success: true };
}

export async function checkOutTool(toolId: string) {
    const currentUser = await getCurrentUserAndRenewSession();


    if (!currentUser) {
        return { error: "You must be logged in" };
    }

    if (currentUser.role === Role.GUEST) {
        return { error: "Guests may not perform this action" };
    }

    const row = await prisma.tool.findUnique({ where: { id: toolId } });

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
            toolId,
            userId: currentUser.id,
            checkedOutAt: new Date(),
            dueAt: getCheckoutDueDate(),
        },
    });

    revalidatePath("/tools");

    return { success: true };
}

export async function checkInTool(toolId: string) {
    const currentUser = await getCurrentUserAndRenewSession();

    if (!currentUser) {
        return { error: "You must be logged in" };
    }

    if (currentUser.role === Role.GUEST) {
        return { error: "Guests may not perform that action" };
    }
    

    const row = await prisma.tool.findUnique({ where: { id: toolId } });

    if (!row) {
        return { error: "Tool not found" };
    }

    const openCheckout = await prisma.checkout.findFirst({
        where: {
            toolId,
            returnedAt: null
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
        data: { returnedAt: new Date() }
    });

    revalidatePath("/tools");

    return { success: true };
}