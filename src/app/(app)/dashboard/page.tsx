import { getCurrentUser } from "@/lib/auth/sessions";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import ApproveButton from "@/components/dashboard/ApproveButton";

export default async function DashboardPage() {
    const user = await getCurrentUser();

    if (!user) {
        return null;
    }

    if (user.role === Role.TECHNICIAN) {
        return <p>Welcome, {user.name}</p>
    }

    const pendingUsers = await prisma.user.findMany({
        where: { role: Role.GUEST },
        orderBy: { createdAt: "asc" },
        select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
        }
    });

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-xl font-semibold">Pending Accounts</h1>

            {pendingUsers.length === 0 && (
                <p className="text-gray-500">No pending accounts.</p>
            )}

            <ul className="flex flex-col gap-2">
                {pendingUsers.map((pendingUser) => (
                    <li
                        key={pendingUser.id}
                        className="flex items-center justify-between rounder border p-3"
                    >
                        <div>
                            <p className="font-medium">{pendingUser.name}</p>
                            <p className="text-sm text-gray-500">{pendingUser.email}</p>
                        </div>
                        <ApproveButton userId={pendingUser.id} />
                    </li>
                ))}
            </ul>
        </div>
    )
}