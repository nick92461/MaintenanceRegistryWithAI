import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth/sessions";
import { getAccessibleProperties } from "@/lib/auth/pageAccess";
import { logout } from "@/lib/actions/auth";
import Brand from "@/components/layout/Brand";

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
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
            <Brand />
            <div className="card flex max-w-md flex-col items-center gap-4 p-8">
                <h1 className="text-xl font-bold">Account Pending Approval</h1>
                <p className="text-muted">
                    Thanks for signing up, {user.name}.{" "}
                    {names
                        ? `Your request to join ${names} is waiting for a supervisor or manager to approve it.`
                        : "You don't have access to a property yet."}{" "}
                    You&apos;ll be able to use the app once that happens.
                </p>
                <form action={logout}>
                    <button type="submit" className="btn btn-secondary">
                        Log out
                    </button>
                </form>
            </div>
        </main>
    );
}
