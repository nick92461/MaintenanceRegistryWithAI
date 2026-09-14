import { prisma } from "@/lib/prisma";
import { InventoryItem } from "@/lib/domain/InventoryItem";
import { getCurrentUser } from "@/lib/auth/sessions";
import { Role } from "@/generated/prisma/enums";
import AddItemForm from "@/components/inventory/AddItemForm";
import InventoryList, { type InventoryListItem } from "@/components/inventory/InventoryList";

export default async function InventoryPage() {
	const user = await getCurrentUser();

	const rows = await prisma.inventoryItem.findMany({
		where: { deletedAt: null },
		orderBy: { name: "asc" },
	});

	const canManage = user?.role === Role.SUPERVISOR || user?.role === Role.MANAGER;

	const items: InventoryListItem[] = rows.map((row) => {
		const item = new InventoryItem(
			row.id,
			row.name,
			row.category,
			row.location,
			row.quantity,
			row.reorderThreshold,
			row.deletedAt,
		);

		return {
			id: item.getId(),
			name: item.getName(),
			category: item.getCategory(),
			location: item.getLocation(),
			quantity: item.getQuantity(),
			statusLabel: item.getStatusLabel(),
			isLowStock: item.isLowStock(),
		};
	});

	return (
		<div className="flex flex-col gap-4">
			<h1 className="text-xl font-semibold">Inventory</h1>

			{canManage && <AddItemForm />}

			<InventoryList items={items} canManage={canManage} />
		</div>
	);
}