import { prisma } from "@/lib/prisma";
import { Tool } from "@/lib/domain/Tool";
import { ToolStatus } from "@/generated/prisma/enums";
import { LEAD_ROLES, STAFF_ROLES } from "@/lib/auth/propertyRole";
import { requirePageRole } from "@/lib/auth/pageAccess";
import AddToolForm from "@/components/tools/AddToolForm";
import ToolsList, { type ToolListItem } from "@/components/tools/ToolsList";
import { PlusIcon } from "@/components/layout/icons";

export default async function ToolsPage({ params }: { params: Promise<{ propertyId: string }> }) {
    const { propertyId } = await params;
    const access = await requirePageRole(propertyId, STAFF_ROLES);

    const rows = await prisma.tool.findMany({
        where: { propertyId: access.property.id, deletedAt: null },
        orderBy: { name: "asc" },
        include: {
            checkouts: {
                where: { returnedAt: null },
                take: 1,
                include: { user: { select: { name: true } } },
            },
        },
    });

    const canManage = LEAD_ROLES.includes(access.role);

    const tools: ToolListItem[] = rows.map((row) => {
        const tool = new Tool(row.id, row.name, row.category, row.location, row.status, row.deletedAt);
        const openCheckout = row.checkouts[0];
        const isCheckedOut = tool.getStatus() === ToolStatus.CHECKED_OUT;
        const isOverDue = isCheckedOut && !!openCheckout && openCheckout.dueAt < new Date();

        return {
            id: tool.getId(),
            name: tool.getName(),
            category: tool.getCategory(),
            location: tool.getLocation(),
            status: tool.getStatus(),
            statusLabel: tool.getStatusLabel(),
            isCheckedOut,
            isOverDue,
            dueAt: openCheckout?.dueAt ?? null,
            checkedOutBy: isCheckedOut ? openCheckout?.user.name ?? null : null,
        };
    });

    const checkedOutCount = tools.filter((tool) => tool.isCheckedOut).length;
    const overdueCount = tools.filter((tool) => tool.isOverDue).length;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="page-title">Tools</h1>
                    <p className="page-sub">
                        {tools.length} {tools.length === 1 ? "tool" : "tools"}, {checkedOutCount} checked out, {overdueCount} overdue
                    </p>
                </div>
            </div>

            {canManage && (
                <details className="card group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
                        <span className="text-sm font-semibold">Add a tool</span>
                        <span className="btn btn-primary btn-sm pointer-events-none">
                            <PlusIcon className="h-4 w-4" />
                            Add tool
                        </span>
                    </summary>
                    <div className="border-t border-line p-4">
                        <AddToolForm propertyId={access.property.id} />
                    </div>
                </details>
            )}

            <ToolsList propertyId={access.property.id} tools={tools} canManage={canManage} />
        </div>
    );
}
