"use server";

import { prisma } from "@/lib/prisma";
import { requirePropertyRole } from "../auth/access";
import { LEAD_ROLES, STAFF_ROLES } from "../auth/propertyRole";
import { Role } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { InventoryItem } from "../domain/InventoryItem";

export async function createInventoryItem(prevState: unknown, formData: FormData) {
    const access = await requirePropertyRole(formData.get("propertyId"), LEAD_ROLES);

    if ("error" in access) {
        return { error: access.error };
    }

    const name = formData.get("name");
    const category = formData.get("category");
    const location = formData.get("location");
    const quantity = formData.get("quantity");
    const reorderThreshold = formData.get("reorderThreshold");

    if (
        typeof name !== "string" ||
        typeof category !== "string" ||
        typeof location !== "string" ||
        typeof quantity !== "string" ||
        typeof reorderThreshold !== "string"
    ) {
        return { error: "Missing required fields" };
    }

    if (name.trim().length === 0 || category.trim().length === 0 || location.trim().length === 0) {
        return { error: "Missing required fields" };
    }

    const quantityNumber = Number(quantity);
    const reorderThresholdNumber = Number(reorderThreshold);

    if (!Number.isInteger(quantityNumber) || quantityNumber < 0) {
        return { error: "Quantity must be a whole number 0 or greater" };
    }

    if (!Number.isInteger(reorderThresholdNumber) || reorderThresholdNumber < 0) {
        return { error: "Reorder threshold must be a whole number 0 or greater" };
    }

    await prisma.inventoryItem.create({
        data: {
            propertyId: access.propertyId,
            name,
            category,
            location,
            quantity: quantityNumber,
            reorderThreshold: reorderThresholdNumber,
        },
    });

    revalidatePath(`/p/${access.propertyId}/inventory`);

    return { success: true };
}

export async function deleteInventoryItem(propertyId: string, itemId: string) {
    const access = await requirePropertyRole(propertyId, LEAD_ROLES);

    if ("error" in access) {
        return { error: access.error };
    }

    const row = await prisma.inventoryItem.findFirst({ where: { id: itemId, propertyId: access.propertyId } });

    if (!row) {
        return { error: "Inventory item not found" };
    }

    const inventoryItem = new InventoryItem(
        row.id,
        row.name,
        row.category,
        row.location,
        row.quantity,
        row.reorderThreshold,
        row.deletedAt,
    );

    inventoryItem.delete();

    await prisma.inventoryItem.update({
        where: { id: itemId },
        data: { deletedAt: inventoryItem.getDeletedAt() },
    });
    
    revalidatePath(`/p/${access.propertyId}/inventory`);

    return { success: true };
}

export async function adjustInventoryQuantity(propertyId: string, itemId: string, amount: number, note?: string) {
    const access = await requirePropertyRole(propertyId, STAFF_ROLES);

    if ("error" in access) {
        return { error: access.error };
    }

    if (access.role === Role.TECHNICIAN && amount > 0) {
        return { error: "You may only remove quantity from an item" };
    }

    const row = await prisma.inventoryItem.findFirst({ where: { id: itemId, propertyId: access.propertyId } });

    if (!row) {
        return { error: "Inventory item not found" };
    }

    const item = new InventoryItem(
        row.id,
        row.name,
        row.category,
        row.location,
        row.quantity,
        row.reorderThreshold,
        row.deletedAt,
    );

    let newQuantity: number;

    try {
        newQuantity = item.adjustQuantity(amount);
    } catch (err) {
        return { error: err instanceof Error ? err.message : "Unable to adjust quantity" };
    }

    await prisma.inventoryItem.update({
        where: { id: itemId },
        data: { quantity: newQuantity },
    });

    await prisma.inventoryAdjustment.create({
        data: {
            propertyId: access.propertyId,
            itemId,
            userId: access.user.id,
            changeAmount: amount,
            resultingQuantity: newQuantity,
            note,
        },
    });

    revalidatePath(`/p/${access.propertyId}/inventory`);

    return { success: true };
}