import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";
import { getCurrentUserAndRenewSession } from "./sessions";
import { resolvePropertyRole } from "./propertyRole";

type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUserAndRenewSession>>>;

export type PropertyAccess = {
    user: CurrentUser;
    propertyId: string;
    role: Role;
};

const NO_ACCESS = "You do not have permission to do that";

export async function requirePropertyRole(propertyId: unknown, allowedRoles: Role[]): Promise<PropertyAccess | { error: string }> {
    const user = await getCurrentUserAndRenewSession();

    if (!user) {
        return { error: "You must be logged in" };
    }

    if (user.mustChangePassword) {
        return { error: "You must set a new password first" };
    }

    if (typeof propertyId !== "string" || propertyId.length === 0) {
        return { error: NO_ACCESS };
    }

    const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: {
            companyId: true,
            memberships: { where: { userId: user.id }, select: { userId: true, role: true } },
        },
    });

    const role = resolvePropertyRole(user, property);

    if (!role || !allowedRoles.includes(role)) {
        return { error: NO_ACCESS };
    }

    return { user, propertyId, role };
}