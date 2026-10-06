import { prisma } from "@/lib/prisma";
import { Tool } from "@/lib/domain/Tool";
import { ToolStatus } from "@/generated/prisma/enums";
import { LEAD_ROLES, STAFF_ROLES } from "@/lib/auth/propertyRole";
import { requirePageRole } from "@/lib/auth/pageAccess";
import AddToolForm from "@/components/tools/AddToolForm";
import ToolsList, { type ToolListItem } from "@/components/tools/ToolsList";

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
        };
    });

    return (
        <div className="flex flex-col gap-2">
            <h1 className="text-xl font-semibold">Tools</h1>

            {canManage && <AddToolForm propertyId={access.property.id} />}

            <ToolsList propertyId={access.property.id} tools={tools} canManage={canManage} />
        </div>
    );
}