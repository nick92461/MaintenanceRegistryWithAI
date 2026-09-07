import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/sessions";
import { logout } from "@/lib/actions/auth";
import { Role } from "@/generated/prisma/enums";

export default async function PendingApprovalPage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/login");
    }

    if (user.role !== Role.GUEST) {
        redirect("/dashboard");
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
            <h1 className="text-xl font-semibold">Account Pending Approval</h1>
            <p className="max-w-sm text-gray-600">
                Thanks for signing up, {user.name}. Your account is waiting for a supervisor or manager to approve access. You'll be able to use the app once that happens.
            </p>
            <form action={logout}>
                <button type="submit" className="text-sm text-blue-600 underline">
                    Log out
                </button>
            </form>
        </main>
    );
}