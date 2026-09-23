import { describe, it, expect } from "vitest";
import { executeTool, type Draft } from "./drafts";

describe("executeTool", () => {
	it("adds an inventory draft", () => {
		const drafts: Draft[] = [];

		const result = executeTool(
			"propose_inventory_item",
			{ name: "9V batteries", category: "Batteries", location: "Supply room", quantity: 120, reorderThreshold: 20 },
			drafts,
		);

		expect(drafts).toHaveLength(1);
		expect(drafts[0]).toMatchObject({ kind: "inventory", name: "9V batteries", quantity: 120 });
		expect(result).toContain(drafts[0].id);
	});

	it("expands a tool count into separate numbered drafts", () => {
		const drafts: Draft[] = [];

		executeTool("propose_tool", { name: "Cordless Drill", category: "Power Tools", location: "Shop 1", count: 3 }, drafts);

		expect(drafts).toHaveLength(3);
		expect(drafts.map((d) => d.name)).toEqual(["Cordless Drill 1", "Cordless Drill 2", "Cordless Drill 3"]);
	});

	it("does not number a tool draft when count is 1", () => {
		const drafts: Draft[] = [];

		executeTool("propose_tool", { name: "Ladder", category: "Access", location: "Shop 1", count: 1 }, drafts);

		expect(drafts[0].name).toBe("Ladder");
	});

	it("updates an existing draft by id instead of creating a new one", () => {
		const drafts: Draft[] = [];
		executeTool(
			"propose_inventory_item",
			{ name: "9V batteries", category: "Batteries", location: "Supply room", quantity: 120, reorderThreshold: 20 },
			drafts,
		);
		const draftId = drafts[0].id;

		executeTool("update_draft", { draftId, quantity: 200 }, drafts);

		expect(drafts).toHaveLength(1);
		expect(drafts[0]).toMatchObject({ quantity: 200, name: "9V batteries" });
	});

	it("removes a draft by id", () => {
		const drafts: Draft[] = [];
		executeTool(
			"propose_inventory_item",
			{ name: "9V batteries", category: "Batteries", location: "Supply room", quantity: 120, reorderThreshold: 20 },
			drafts,
		);
		const draftId = drafts[0].id;

		const result = executeTool("remove_draft", { draftId }, drafts);

		expect(drafts).toHaveLength(0);
		expect(result).toContain(draftId);
	});

	it("reports an error instead of throwing on a malformed tool call", () => {
		const drafts: Draft[] = [];

		const result = executeTool("propose_inventory_item", { name: "Missing fields" }, drafts);

		expect(drafts).toHaveLength(0);
		expect(result.toLowerCase()).toContain("error");
	});

	it("reports an error instead of throwing on an update to a missing draft", () => {
		const drafts: Draft[] = [];

		const result = executeTool("update_draft", { draftId: "does-not-exist", quantity: 5 }, drafts);

		expect(result.toLowerCase()).toContain("error");
	});

	it("reports an error for an unknown tool name", () => {
		const result = executeTool("delete_everything", {}, []);

		expect(result.toLowerCase()).toContain("error");
	});

		it("continues numbering after existing saved tools", () => {
		const drafts: Draft[] = [];

		executeTool(
			"propose_tool",
			{ name: "Cordless Drill", category: "Power Tools", location: "Shop 1", count: 2 },
			drafts,
			["Cordless Drill 1", "Cordless Drill 2", "Cordless Drill 3"],
		);

		expect(drafts.map((d) => d.name)).toEqual(["Cordless Drill 4", "Cordless Drill 5"]);
	});

	it("continues numbering after drafts already in the list", () => {
		const drafts: Draft[] = [];

		executeTool("propose_tool", { name: "Cordless Drill", category: "Power Tools", location: "Shop 1", count: 3 }, drafts);
		executeTool("propose_tool", { name: "Cordless Drill", category: "Power Tools", location: "Shop 1", count: 2 }, drafts);

		expect(drafts.map((d) => d.name)).toEqual([
			"Cordless Drill 1",
			"Cordless Drill 2",
			"Cordless Drill 3",
			"Cordless Drill 4",
			"Cordless Drill 5",
		]);
	});

	it("treats an existing unnumbered tool as number 1", () => {
		const drafts: Draft[] = [];

		executeTool("propose_tool", { name: "Ladder", category: "Access", location: "Shop 1", count: 2 }, drafts, ["Ladder"]);

		expect(drafts.map((d) => d.name)).toEqual(["Ladder 2", "Ladder 3"]);
	});

	it("numbers a single new tool when one with the same name already exists", () => {
		const drafts: Draft[] = [];

		executeTool("propose_tool", { name: "Ladder", category: "Access", location: "Shop 1", count: 1 }, drafts, ["Ladder"]);

		expect(drafts[0].name).toBe("Ladder 2");
	});

	it("does not confuse a longer tool name that starts the same way", () => {
		const drafts: Draft[] = [];

		executeTool("propose_tool", { name: "Drill", category: "Power Tools", location: "Shop 1", count: 1 }, drafts, ["Drill Press 2"]);

		expect(drafts[0].name).toBe("Drill");
	});

	it("rejects a tool count above the cap or that is not a whole number", () => {
		const drafts: Draft[] = [];

		const tooMany = executeTool("propose_tool", { name: "Key", category: "Hardware", location: "Office", count: 101 }, drafts);
		const fractional = executeTool("propose_tool", { name: "Key", category: "Hardware", location: "Office", count: 2.5 }, drafts);

		expect(drafts).toHaveLength(0);
		expect(tooMany.toLowerCase()).toContain("error");
		expect(fractional.toLowerCase()).toContain("error");
	});
});