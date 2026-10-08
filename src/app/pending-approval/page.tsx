import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/sessions";
import { getAccessibleProperties } from "@/lib/auth/pageAccess";
import { logout } from "@/lib/actions/auth";

export default async function PendingApprovalPage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/login");
    }

    const properties = await getAccessibleProperties();

    if (properties.length > 0 || user.isCompanyAdmin) {
        redirect("/dashboard");
    }

    const pending = await prisma.propertyMembership.findMany({
        where: { userId: user.id, role: Role.GUEST },
        select: { property: { select: { name: true } } },
    });

    const names = pending.map((m) => m.property.name).join(", ");

    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
            <h1 className="text-xl font-semibold">Account Pending Approval</h1>
            <p className="max-w-sm text-gray-600">
                Thanks for signing up, {user.name}.{" "}
                {names
                    ? `Your request to join ${names} is waiting for a supervisor or manager to approve it.`
                    : "You don't have access to a property yet."}{" "}
                You&apos;ll be able to use the app once that happens.
            </p>
            <form action={logout}>
                <button type="submit" className="text-sm text-blue-600 underline">
                    Log out
                </button>
            </form>
        </main>
    );
}