import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/sessions";
import { logout } from "@/lib/actions/auth";
import { Role } from "@/generated/prisma/enums";




export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const user = await getCurrentUser();

    async function goToDashboard() {
        "use server";
        redirect("/dashboard");
    }

    
    if (!user) {
        redirect("/login");
    }

    if (user.role === Role.GUEST) {
        redirect("/pending-approval");
    }

    return (
        <div className="min-h-screen">
            <header className="flex items-center justify-between border-b px-6 py-4">
                <div>
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.role}</p>
                </div>

                <div className="flex flex-col gap-1">
                    <form action={logout}>
                        <button type="submit" className="text-sm text-blue-600 underline">
                            Log out
                        </button>
                    </form>
                    <form action={goToDashboard}>
                        <button type="submit" className="text-sm text-blue-600 underline">
                            Back to Dashboard
                        </button>
                    </form>
                </div>
            </header>
            <main className="p-6">{children}</main>
        </div>
    )
}