import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/sessions";
import { getAccessibleProperties } from "@/lib/auth/pageAccess";
import AppTopBar from "@/components/layout/AppTopBar";

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
            {company?.isDemo && (
                <p className="border-b border-orange-200 bg-orange-50 px-6 py-2.5 text-[13px] text-orange-900">
                    This is a private demo with sample data that only you can see. It&apos;s deleted automatically a day after you started it.
                    The assistant is AI, and its messages are processed by Anthropic, so please don&apos;t enter real personal or confidential information.
                </p>
            )}

            <AppTopBar userName={user.name} isCompanyAdmin={user.isCompanyAdmin} />

            {children}
        </div>
    );
}
