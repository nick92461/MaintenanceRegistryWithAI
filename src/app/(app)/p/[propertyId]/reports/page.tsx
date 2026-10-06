import { LEAD_ROLES } from "@/lib/auth/propertyRole";
import { requirePageRole } from "@/lib/auth/pageAccess";
import ReportForm from "@/components/reports/ReportForm";

export default async function ReportsPage({ params }: { params: Promise<{ propertyId: string }> }) {
    const { propertyId } = await params;
    const access = await requirePageRole(propertyId, LEAD_ROLES);

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-xl font-semibold">Reports</h1>
            <ReportForm propertyId={access.property.id} />
        </div>
    );
}