"use server";

import { prisma } from "@/lib/prisma";
import { requirePropertyRole } from "../auth/access";
import { LEAD_ROLES, MANAGER_ROLES, canRemoveFromCompany } from "../auth/propertyRole";
import { Role } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { User } from "../domain/User";

export async function updateUserRole(propertyId: string, targetUserId: string, newRole: Role) {
    const access = await requirePropertyRole(propertyId, LEAD_ROLES);

    if ("error" in access) {
        return { error: access.error };
    }

    if (!Object.values(Role).includes(newRole)) {
        return { error: "Invalid role" };
    }

    if (access.user.id === targetUserId) {
        return { error: "You cannot change your own role" };
    }

    const key = { userId_propertyId: { userId: targetUserId, propertyId: access.propertyId } };
    const membership = await prisma.propertyMembership.findUnique({ where: key });

    if (!membership) {
        return { error: "User not found" };
    }

    if (access.role === Role.SUPERVISOR) {
        if (membership.role !== Role.GUEST || newRole !== Role.TECHNICIAN) {
            return { error: "Supervisors can only approve pending accounts as technician" };
        }
    }

    await prisma.propertyMembership.update({ where: key, data: { role: newRole } });

    revalidatePath(`/p/${access.propertyId}/users`);

    return { success: true };
}

export async function removeUserFromProperty(propertyId: string, targetUserId: string) {
    const access = await requirePropertyRole(propertyId, MANAGER_ROLES);

    if ("error" in access) {
        return { error: access.error };
    }

    if (access.user.id === targetUserId) {
        return { error: "You cannot remove yourself" };
    }

    const key = { userId_propertyId: { userId: targetUserId, propertyId: access.propertyId } };
    const membership = await prisma.propertyMembership.findUnique({ where: key });

    if (!membership) {
        return { error: "User not found" };
    }

    await prisma.propertyMembership.delete({ where: key });

    revalidatePath(`/p/${access.propertyId}/users`);

    return { success: true };
}

export async function removeUserFromCompany(propertyId: string, targetUserId: string) {
    const access = await requirePropertyRole(propertyId, MANAGER_ROLES);

    if ("error" in access) {
        return { error: access.error };
    }

    if (access.user.id === targetUserId) {
        return { error: "You cannot remove your own account" };
    }

    const target = await prisma.user.findFirst({
        where: { id: targetUserId, companyId: access.user.companyId, deletedAt: null, isCompanyAdmin: false },
        select: { id: true, deletedAt: true, memberships: { select: { propertyId: true } } },
    });

    if (!target || !target.memberships.some((m) => m.propertyId === access.propertyId)) {
        return { error: "User not found" };
    }

    const managed = await prisma.propertyMembership.findMany({
        where: { userId: access.user.id, role: Role.MANAGER },
        select: { propertyId: true },
    });

    const allowed = canRemoveFromCompany(
        { isCompanyAdmin: access.user.isCompanyAdmin, managedPropertyIds: managed.map((m) => m.propertyId) },
        target.memberships.map((m) => m.propertyId),
    );

    if (!allowed) {
        return { error: "This person also works at properties you don't manage, you must remove them from your own properties individually." };
    }

    const user = new User(target.id, target.deletedAt);

    user.delete();

    await prisma.$transaction([
        prisma.session.deleteMany({ where: { userId: target.id} }),
        prisma.propertyMembership.deleteMany({ where: { userId: target.id } }),
        prisma.user.update({ where: { id: target.id }, data: { deletedAt: user.getDeletedAt() } }),
    ]);

    revalidatePath(`/p/${access.propertyId}/users`);

    return { success: true };
}