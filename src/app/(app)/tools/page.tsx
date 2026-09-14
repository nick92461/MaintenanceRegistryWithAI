import { prisma } from "@/lib/prisma";
import { Tool } from "@/lib/domain/Tool";
import { getCurrentUser } from "@/lib/auth/sessions";
import { Role, ToolStatus } from "@/generated/prisma/enums";
import AddToolForm from "@/components/tools/AddToolForm";
import ToolsList, { type ToolListItem } from "@/components/tools/ToolsList";

export default async function ToolsPage() {
    const user = await getCurrentUser();

    const rows = await prisma.tool.findMany({
        where: { deletedAt: null },
        orderBy: { name: "asc" },
        include: {
            checkouts: {
                where: { returnedAt: null },
                take: 1,
            },
        },
    });

    const canManage = user?.role === Role.SUPERVISOR || user?.role === Role.MANAGER;

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

            {canManage && <AddToolForm />}

            <ToolsList tools={tools} canManage={canManage} />
        </div>
    );
}