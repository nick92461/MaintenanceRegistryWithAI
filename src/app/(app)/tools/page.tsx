import { prisma } from "@/lib/prisma";
import { Tool } from "@/lib/domain/Tool";
import { getCurrentUser } from "@/lib/auth/sessions";
import { Role, ToolStatus } from "@/generated/prisma/enums";
import AddToolForm from "@/components/tools/AddToolForm";
import ToolActionButton from "@/components/tools/ToolActionButton";

export default async function ToolsPage() {
    const user = await getCurrentUser();

    const rows = await prisma.tool.findMany({
        orderBy: { name: "asc" },
        include: {
            checkouts: {
                where: { returnedAt: null },
                take: 1,
            },
        },
    });

    return (
        <div className="flex flex-col gap-2">
            <h1 className="text-xl font-semibold">Tools</h1>

            {(user?.role === Role.SUPERVISOR || user?.role === Role.MANAGER) && <AddToolForm />}

            {rows.length === 0 && <p className="text-gray-500">No tools yet.</p>}

            <ul className="flex flex-col gap-2">
                {rows.map((row) => {
                    const tool = new Tool(
                        row.id,
                        row.name,
                        row.category,
                        row.location,
                        row.status
                    );
                    const openCheckout = row.checkouts[0];
                    const isCheckedOut = tool.getStatus() === ToolStatus.CHECKED_OUT;
                    const isOverDue = isCheckedOut && !!openCheckout && openCheckout.dueAt < new Date();

                    return (
                        <li
                            key={tool.getId()}
                            className={
                                isCheckedOut
                                ? "flex items-center justify-between rounded border bg-gray-100 p-3 opacity-60"
                                : "flex items-center justify-between rounded border p-3"
                            }
                        >
                            <div>
                                <p className="font-medium">{tool.getName()}</p>
                                <p className="text-sm text-gray-500">{tool.getCategory()} - {tool.getLocation()}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                {isCheckedOut && (
                                    <span className="rounded bg-gray-500 px-2 py-1 text-xs font-semibold text-white">
                                        Due {openCheckout.dueAt.toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                                    </span>
                                )}
                                {isOverDue && (
                                    <span className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white">
                                        Overdue
                                    </span>
                                )}
                                <span className="text-sm text-gray-500">
                                    {tool.getStatusLabel()}
                                </span>
                                <ToolActionButton toolId={tool.getId()} status={tool.getStatus()} />
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    )
}