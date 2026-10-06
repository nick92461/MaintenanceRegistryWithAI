import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/sessions";
import { getAccessibleProperties } from "@/lib/auth/pageAccess";
import { logout } from "@/lib/actions/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/login");
    }

    if (user.mustChangePassword) {
        redirect("/change-password");
    }

    const company = await prisma.company.findUnique({ where: { id: user.companyId }, select: { isDemo: true } });

    const properties = await getAccessibleProperties();

    if (properties.length === 0 && !user.isCompanyAdmin) {
        redirect("/pending-approval");
    }

    return (
        <div className="min-h-screen">
            <header className="flex items-center justify-between border-b px-6 py-4">
                <div>
                    <p className="font-semibold">{user.name}</p>
                    {user.isCompanyAdmin && <p className="text-sm text-gray-500">Company admin</p>}
                </div>

                <div className="flex flex-col gap-1">
                    <form action={logout}>
                        <button type="submit" className="text-sm text-blue-600 underline">
                            Log out
                        </button>
                    </form>
                    <Link href="/dashboard" className="text-sm text-blue-600 underline">
                        Dashboard
                    </Link>
                    <Link href="/account" className="text-sm text-blue-600 underline">
                        Account
                    </Link>
                </div>
            </header>

            {company?.isDemo && (
                <p className="border-b bg-yellow-100 px-6 py-2 text-sm text-yellow-900">
                    This is a private demo with sample data that only you can see. It&apos;s deleted automatically a day after you started it.
                </p>
            )}

            <main className="p-6">{children}</main>
        </div>
    );
}