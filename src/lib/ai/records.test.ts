import { describe, it, expect } from "vitest";
import { withDraftList, formatRecords } from "./records";
import type { Draft } from "./drafts";

describe("formatRecords", () => {
	it("says none for each empty section", () => {
		const text = formatRecords({ inventory: [], tools: [] }, []);

		expect(text).toContain("Saved inventory items: none");
		expect(text).toContain("Saved tools: none");
		expect(text).toContain("Drafts pending review: none");
	});

	it("lists saved records", () => {
		const text = formatRecords(
			{
				inventory: [
					{ name: "9V batteries", category: "Batteries", location: "Supply room", quantity: 120, reorderThreshold: 24 },
				],
				tools: [{ name: "Cordless Drill 1", category: "Power Tools", location: "Shop 1" }],
			},
			[],
		);

		expect(text).toContain("Saved inventory items (1):");
		expect(text).toContain("- 9V batteries | Batteries | Supply room | qty 120 | reorder at 24");
		expect(text).toContain("Saved tools (1):");
		expect(text).toContain("- Cordless Drill 1 | Power Tools | Shop 1");
	});

	it("lists drafts with their ids so they can be updated or removed", () => {
		const drafts: Draft[] = [
			{ id: "abc-123", kind: "inventory", name: "AA batteries", category: "Batteries", location: "Shop 1", quantity: 48, reorderThreshold: 12 },
			{ id: "def-456", kind: "tool", name: "Ladder", category: "Access", location: "Shop 1" },
		];

		const text = formatRecords({ inventory: [], tools: [] }, drafts);

		expect(text).toContain("Drafts pending review (2):");
		expect(text).toContain("[inventory] id abc-123 | AA batteries");
		expect(text).toContain("[tool] id def-456 | Ladder");
	});
});

describe("withDraftList", () => {
	it("puts the draft list, with ids, after the system prompt", () => {
		const drafts: Draft[] = [
			{ id: "abc-123", kind: "inventory", name: "AA batteries", category: "Batteries", location: "Shop 1", quantity: 48, reorderThreshold: 12 },
		];

		const text = withDraftList("BASE PROMPT", drafts);

		expect(text.startsWith("BASE PROMPT")).toBe(true);
		expect(text).toContain("Drafts pending review (1):");
		expect(text).toContain("id abc-123 | AA batteries");
	});

	it("says there are no drafts when the list is empty", () => {
		expect(withDraftList("BASE PROMPT", [])).toContain("Drafts pending review: none");
	});
});