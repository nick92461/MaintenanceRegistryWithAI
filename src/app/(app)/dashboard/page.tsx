import { getCurrentUser } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import ApproveButton from "@/components/dashboard/ApproveButton";
import PromoteUserButton from "@/components/dashboard/PromoteUserButton";
import DeleteUserButton from "@/components/dashboard/DeleteUserButton";
import DemoteUserButton from "@/components/dashboard/DemoteUserButton";

export default async function DashboardPage() {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return null;
    }

    if (currentUser.role === Role.TECHNICIAN) {
        return <p>Welcome, {currentUser.name}</p>
    }

    const allUsers = await prisma.user.findMany({
        where: { deletedAt: null },
        orderBy: { role: "asc" },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            deletedAt: true,
        }
    });

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-xl font-semibold">Users</h1>

            {allUsers.length === 0 && (
                <p className="text-gray-500">No users.</p>
            )}

            <ul className="flex flex-col gap-2">
                {allUsers.map((user) => (
                    <li
                        key={user.id}
                        className="flex items-center justify-between rounded border p-3"
                    >
                        <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-gray-500">{user.role}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {(currentUser.role === Role.MANAGER && user.role !== Role.GUEST && currentUser.id !== user.id) && <DemoteUserButton userId={user.id} currentRole={user.role} />}
                            {(user.role !== Role.GUEST && user.role !== Role.MANAGER && currentUser.role === Role.MANAGER) && <PromoteUserButton userId={user.id} currentRole={user.role} />}
                            {user.role === Role.GUEST && <ApproveButton userId={user.id} />}
                            {(currentUser.role === Role.MANAGER && currentUser.id !== user.id) && <DeleteUserButton userId={user.id} />}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    )
}