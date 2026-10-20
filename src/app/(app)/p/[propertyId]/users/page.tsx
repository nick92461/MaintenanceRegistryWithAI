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
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="page-title">Users</h1>
                <p className="page-sub">
                    {members.length} {members.length === 1 ? "person has" : "people have"} access to this property.
                </p>
            </div>

            {members.length === 0 && (
                <p className="text-muted">No users.</p>
            )}

            <ul className="flex flex-col gap-3">
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
                            className="card flex flex-wrap items-center justify-between gap-3 p-4"
                        >
                            <div className="flex items-center gap-3.5">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-canvas text-sm font-semibold text-muted">
                                    {user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("")}
                                </span>
                                <div>
                                    <p className="font-semibold">
                                        {user.name}
                                        {isSelf && <span className="ml-2 text-xs font-normal text-muted">(you)</span>}
                                    </p>
                                    <p className="text-[13px] text-muted">{user.email}</p>
                                </div>
                                <span className={role === Role.GUEST ? "badge badge-amber" : role === Role.MANAGER ? "badge badge-slate" : "badge badge-blue"}>
                                    {role === Role.GUEST ? "Pending approval" : role.charAt(0) + role.slice(1).toLowerCase()}
                                </span>
                            </div>
                            <div className="flex flex-wrap items-start gap-2">
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