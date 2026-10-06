import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { prisma } from "../prisma";
import { Role } from "@/generated/prisma/enums";
import { getCurrentUser } from "./sessions";
import { resolvePropertyRole } from "./propertyRole";

export type AccessibleProperty = {
    id: string;
    name: string;
    role: Role;
};

export const getPropertyAccess = cache(async (propertyId: string) => {
    const user = await getCurrentUser();

    if (!user) {
        return null;
    }

    const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: {
            id: true,
            name: true,
            companyId: true,
            memberships: { where: { userId: user.id }, select: { userId: true, role: true } },
        },
    });

    const role = resolvePropertyRole(user, property);

    if (!property || !role) {
        return null;
    }

    return { user, property: { id: property.id, name: property.name }, role };
});

export const getAccessibleProperties = cache(async (): Promise<AccessibleProperty[]> => {
    const user = await getCurrentUser();

    if (!user) {
        return [];
    }

    if (user.isCompanyAdmin) {
        const all = await prisma.property.findMany({
            where: { companyId: user.companyId },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
        });

        return all.map((property) => ({ ...property, role: Role.MANAGER }));
    }

    const memberships = await prisma.propertyMembership.findMany({
        where: { userId: user.id, role: { not: Role.GUEST }, property: { companyId: user.companyId } },
        select: { role: true, property: { select: { id: true, name: true } } },
        orderBy: { property: { name: "asc" } },
    });

    return memberships.map((m) => ({ id: m.property.id, name: m.property.name, role: m.role }));
});

export async function requirePageRole(propertyId: string, allowedRoles: Role[]) {
    const access = await getPropertyAccess(propertyId);

    if (!access) {
        notFound();
    }

    if (!allowedRoles.includes(access.role)) {
        redirect(`/p/${access.property.id}`);
    }

    return access;
}