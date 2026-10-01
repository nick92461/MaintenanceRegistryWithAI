import { Role } from "@/generated/prisma/enums";

export const STAFF_ROLES: Role[] = [Role.TECHNICIAN, Role.SUPERVISOR, Role.MANAGER];
export const LEAD_ROLES: Role[] = [Role.SUPERVISOR, Role.MANAGER];
export const MANAGER_ROLES: Role[] = [Role.MANAGER];

type UserForAccess = {
    id: string;
    companyId: string;
    isCompanyAdmin: boolean;
};

type PropertyForAccess = {
    companyId: string;
    memberships: { userId: string; role: Role }[];
} | null;

export function resolvePropertyRole(user: UserForAccess, property: PropertyForAccess): Role | null {
    if (!property || property.companyId !== user.companyId) {
        return null;
    }

    if (user.isCompanyAdmin) {
        return Role.MANAGER;
    }

    const membership = property.memberships.find((m) => m.userId === user.id);

    return membership?.role ?? null;
}

export function canRemoveFromCompany(
    actor: { isCompanyAdmin: boolean; managedPropertyIds: string[] }, 
    targetPropertyIds: string[],
): boolean {
    if (actor.isCompanyAdmin) {
        return true;
    }

    return targetPropertyIds.length > 0 && targetPropertyIds.every((id) => actor.managedPropertyIds.includes(id));
}