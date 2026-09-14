import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/sessions";
import { Role } from "@/generated/prisma/enums";
import ReportForm from "@/components/reports/ReportForm";

export default async function ReportsPage() {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return null;
    }

    if (currentUser.role !== Role.SUPERVISOR && currentUser.role !== Role.MANAGER) {
        redirect("/dashboard");
    }

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-xl font-semibold">Reports</h1>
            <ReportForm />
        </div>
    );
}