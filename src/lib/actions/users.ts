"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserAndRenewSession } from "@/lib/auth/sessions";
import { Role } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";

export async function updateUserRole(targetUserId: string, newRole: Role) {
    const currentUser = await getCurrentUserAndRenewSession();

    if (!currentUser) {
        return { error: "You must be logged in" };
    }

    if (currentUser.role !== Role.SUPERVISOR && currentUser.role !== Role.MANAGER) {
        return { error: "You do not have permission to change roles" };
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });

    if (!targetUser) {
        return { error: "User not found" };
    }

    if (currentUser.role === Role.SUPERVISOR) {
        if (targetUser.role !== Role.GUEST || newRole !== Role.TECHNICIAN) {
            return { error: "Supervisors can only approve pending accounts as Technician" };
        }
    }

    await prisma.user.update({
        where: { id: targetUserId },
        data: { role: newRole },
    });

    revalidatePath("/dashboard");
    return { success: true };
}