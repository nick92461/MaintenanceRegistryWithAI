import { prisma } from "@/lib/prisma";
import { InventoryItem } from "@/lib/domain/InventoryItem";
import { LEAD_ROLES, STAFF_ROLES } from "@/lib/auth/propertyRole";
import { requirePageRole } from "@/lib/auth/pageAccess";
import AddItemForm from "@/components/inventory/AddItemForm";
import InventoryList, { type InventoryListItem } from "@/components/inventory/InventoryList";

export default async function InventoryPage({ params }: { params: Promise<{ propertyId: string }> }) {
	const { propertyId } = await params;
	const access = await requirePageRole(propertyId, STAFF_ROLES);

	const rows = await prisma.inventoryItem.findMany({
		where: { propertyId: access.property.id, deletedAt: null },
		orderBy: { name: "asc" },
	});

	const canManage = LEAD_ROLES.includes(access.role);

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
			<h1 className="text-5xl font-semibold mb-5 text-center pl-5">Inventory</h1>

			<div className="mb-10">
				{canManage && <AddItemForm propertyId={access.property.id} />}
			</div>

			<div>
				<h2 className="text-xl font-semibold mb-2">Inventory List</h2>
				<InventoryList propertyId={access.property.id} items={items} canManage={canManage} />
			</div>
		</div>
	);
}