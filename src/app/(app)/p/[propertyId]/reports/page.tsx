import { LEAD_ROLES } from "@/lib/auth/propertyRole";
import { requirePageRole } from "@/lib/auth/pageAccess";
import ReportForm from "@/components/reports/ReportForm";

export default async function ReportsPage({ params }: { params: Promise<{ propertyId: string }> }) {
    const { propertyId } = await params;
    const access = await requirePageRole(propertyId, LEAD_ROLES);

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="page-title">Reports</h1>
                <p className="page-sub">See how tools and supplies are being used, by month or a custom date range.</p>
            </div>
            <ReportForm propertyId={access.property.id} />
        </div>
    );
}
