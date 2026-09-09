import { prisma } from "@/lib/prisma";
import { InventoryItem } from "@/lib/domain/InventoryItem";
import { getCurrentUser } from "@/lib/auth/sessions";
import { Role } from "@/generated/prisma/enums";
import AddItemForm from "@/components/inventory/AddItemForm";
import AdjustQuantityForm from "@/components/inventory/AdjustQuantityForm";
import DeleteItemButton from "@/components/inventory/DeleteItemButton";

export default async function InventoryPage() {
    const user = await getCurrentUser();

    const rows = await prisma.inventoryItem.findMany({
        where: { deletedAt: null },
        orderBy: { name: "asc" },
    });

    const items = rows.map(
        (row) =>
            new InventoryItem(
                row.id,
                row.name,
                row.category,
                row.location,
                row.quantity,
                row.reorderThreshold,
                row.deletedAt,
            ),
    );

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-xl font-semibold">Inventory</h1>

            {(user?.role === Role.SUPERVISOR || user?.role === Role.MANAGER) && <AddItemForm />}

            {items.length === 0 && <p className="text-gray-500">No inventory items yet.</p>}

            <ul className="flex flex-col gap-2">
                {items.map((item) => (
                    <li
                        key={item.getId()}
                        className="flex items-center justify-between rounded border p-3"
                    >
                        <div>
                            <p className="font-medium">{item.getName()}</p>
                            <p className="text-sm text-gray-500">
                                {item.getCategory()} - {item.getLocation()}
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            {(user?.role === Role.SUPERVISOR || user?.role === Role.MANAGER) && <DeleteItemButton itemId={item.getId()} />}
                            <div className="text-right">
                                <p className="font-medium">{item.getQuantity()}</p>
                                <p className={item.isLowStock() ? "text-sm text-red-600" : "text-sm text-gray-500"}>
                                    {item.getStatusLabel()}
                                </p>
                            </div>
                            <AdjustQuantityForm itemId={item.getId()} />
                        </div>    
                    </li>
                ))}
            </ul>
        </div>
    );
}