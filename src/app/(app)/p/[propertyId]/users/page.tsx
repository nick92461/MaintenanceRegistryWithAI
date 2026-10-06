import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { LEAD_ROLES, canRemoveFromCompany } from "@/lib/auth/propertyRole";
import { requirePageRole } from "@/lib/auth/pageAccess";
import ApproveButton from "@/components/users/ApproveButton";
import PromoteUserButton from "@/components/users/PromoteUserButton";
import DemoteUserButton from "@/components/users/DemoteUserButton";
import RemoveUserButton from "@/components/users/RemoveUserButton";

export default async function UsersPage({ params }: { params: Promise<{ propertyId: string }> }) {
    const { propertyId } = await params;
    const access = await requirePageRole(propertyId, LEAD_ROLES);

    const members = await prisma.propertyMembership.findMany({
        where: { propertyId: access.property.id },
        orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
        select: {
            role: true,
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    memberships: { select: { propertyId: true } },
                },
            },
        },
    });

    const isManager = access.role === Role.MANAGER;

    // The properties this person manages, to decide who they can remove from the whole company.
    const managedPropertyIds =
        isManager && !access.user.isCompanyAdmin
            ? (
                  await prisma.propertyMembership.findMany({
                      where: { userId: access.user.id, role: Role.MANAGER },
                      select: { propertyId: true },
                  })
              ).map((m) => m.propertyId)
            : [];

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-xl font-semibold">Users</h1>

            {members.length === 0 && (
                <p className="text-gray-500">No users.</p>
            )}

            <ul className="flex flex-col gap-2">
                {members.map(({ role, user }) => {
                    const isSelf = access.user.id === user.id;
                    const canRemoveEverywhere =
                        isManager &&
                        !isSelf &&
                        canRemoveFromCompany(
                            { isCompanyAdmin: access.user.isCompanyAdmin, managedPropertyIds },
                            user.memberships.map((m) => m.propertyId),
                        );

                    return (
                        <li
                            key={user.id}
                            className="flex items-center justify-between rounded border p-3"
                        >
                            <div>
                                <p className="font-medium">{user.name}</p>
                                <p className="text-sm text-gray-500">{role}</p>
                                <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {isManager && !isSelf && role !== Role.GUEST && (
                                    <DemoteUserButton propertyId={propertyId} userId={user.id} currentRole={role} />
                                )}
                                {isManager && role !== Role.GUEST && role !== Role.MANAGER && (
                                    <PromoteUserButton propertyId={propertyId} userId={user.id} currentRole={role} />
                                )}
                                {role === Role.GUEST && <ApproveButton propertyId={propertyId} userId={user.id} />}
                                {isManager && !isSelf && (
                                    <RemoveUserButton propertyId={propertyId} userId={user.id} scope="property" />
                                )}
                                {canRemoveEverywhere && (
                                    <RemoveUserButton propertyId={propertyId} userId={user.id} scope="company" />
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}