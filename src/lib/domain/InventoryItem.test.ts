import { describe, it, expect } from "vitest";
import { InventoryItem } from "./InventoryItem";

function makeItem(quantity: number, reorderThreshold: number) {
	return new InventoryItem("item-1", "AA Batteries", "Batteries", "Shop 1", quantity, reorderThreshold, null);
}

describe("InventoryItem", () => {
	it("returns the values passed into its constructor via inherited getters", () => {
		const item = makeItem(50, 20);

		expect(item.getId()).toBe("item-1");
		expect(item.getName()).toBe("AA Batteries");
		expect(item.getCategory()).toBe("Batteries");
		expect(item.getLocation()).toBe("Shop 1");
		expect(item.getQuantity()).toBe(50);
	});

	it("increases quantity when adjusted by a positive amount", () => {
		const item = makeItem(50, 20);
		const result = item.adjustQuantity(10);

		expect(result).toBe(60);
		expect(item.getQuantity()).toBe(60);
	});

	it("decreases quantity when adjusted by a negative amount that stays at or above zero", () => {
		const item = makeItem(50, 20);
		const result = item.adjustQuantity(-30);

		expect(result).toBe(20);
		expect(item.getQuantity()).toBe(20);
	});

	it("refuses to adjust quantity below zero", () => {
		const item = makeItem(10, 20);

		expect(() => item.adjustQuantity(-11)).toThrow();
		expect(item.getQuantity()).toBe(10);
	});

	it("reports low stock when quantity is below the reorder threshold", () => {
		const item = makeItem(5, 20);
		expect(item.isLowStock()).toBe(true);
	});

	it("reports low stock when quantity exactly equals the reorder threshold", () => {
		const item = makeItem(20, 20);
		expect(item.isLowStock()).toBe(true);
	});

	it("does not report low stock when quantity is above the reorder threshold", () => {
		const item = makeItem(21, 20);
		expect(item.isLowStock()).toBe(false);
	});

	it("labels a low-stock item as Low Stock", () => {
		const item = makeItem(5, 20);
		expect(item.getStatusLabel()).toBe("Low Stock");
	});

	it("labels a well-stocked item as In Stock", () => {
		const item = makeItem(50, 20);
		expect(item.getStatusLabel()).toBe("In Stock");
	});

	it("sets deletedAt when deleted", () => {
		const item = makeItem(50, 20);
		expect(item.getDeletedAt()).toBeNull();
		item.delete();
		expect(item.getDeletedAt()).toBeInstanceOf(Date);
	});
});