"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserAndRenewSession } from "../auth/sessions";
import { Role } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { InventoryItem } from "../domain/InventoryItem";

export async function createInventoryItem(formData: FormData) {
    const currentUser = await getCurrentUserAndRenewSession();

    if (!currentUser) {
        return { error: "You must be logged in" };
    }

    if (currentUser.role !== Role.SUPERVISOR && currentUser.role !== Role.MANAGER) {
        return { error: "You do not have permission to add inventory items" };
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
            name,
            category,
            location,
            quantity: quantityNumber,
            reorderThreshold: reorderThresholdNumber,
        },
    });

    revalidatePath("/inventory");

    return { success: true };
}

export async function adjustInventoryQuantity(itemId: string, amount: number, note?: string) {
    const currentUser = await getCurrentUserAndRenewSession();

    if (!currentUser) {
        return { error: "You must be logged in" };
    }

    const row = await prisma.inventoryItem.findUnique({ where: { id: itemId } });

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
            itemId,
            userId: currentUser.id,
            changeAmount: amount,
            resultingQuantity: newQuantity,
            note,
        },
    });

    revalidatePath("/inventory")

    return { success: true };
}