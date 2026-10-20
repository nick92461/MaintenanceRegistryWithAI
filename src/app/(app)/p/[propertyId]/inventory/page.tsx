import { prisma } from "@/lib/prisma";
import { InventoryItem } from "@/lib/domain/InventoryItem";
import { LEAD_ROLES, STAFF_ROLES } from "@/lib/auth/propertyRole";
import { requirePageRole } from "@/lib/auth/pageAccess";
import AddItemForm from "@/components/inventory/AddItemForm";
import InventoryList, { type InventoryListItem } from "@/components/inventory/InventoryList";
import { PlusIcon } from "@/components/layout/icons";

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
			reorderThreshold: row.reorderThreshold,
			statusLabel: item.getStatusLabel(),
			isLowStock: item.isLowStock(),
		};
	});

	const lowStockCount = items.filter((item) => item.isLowStock).length;

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="page-title">Inventory</h1>
				<p className="page-sub">
					{items.length} {items.length === 1 ? "supply" : "supplies"}, {lowStockCount} at or below their reorder level
				</p>
			</div>

			{canManage && (
				<details className="card group">
					<summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
						<span className="text-sm font-semibold">Add an inventory item</span>
						<span className="btn btn-primary btn-sm pointer-events-none">
							<PlusIcon className="h-4 w-4" />
							Add item
						</span>
					</summary>
					<div className="border-t border-line p-4">
						<AddItemForm propertyId={access.property.id} />
					</div>
				</details>
			)}

			<InventoryList propertyId={access.property.id} items={items} canManage={canManage} />
		</div>
	);
}
